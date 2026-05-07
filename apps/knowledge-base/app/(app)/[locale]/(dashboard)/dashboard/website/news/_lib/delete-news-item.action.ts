"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq, inArray, or } from "@/lib/db/sql";
import {
	deleteWebsiteDocument,
	getWebsiteDocumentDescriptorByEntityId,
} from "@/lib/search/website-index";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function deleteNewsItemAction(id: string): Promise<void> {
	await assertAdmin();

	const descriptor = await db.transaction(async (tx) => {
		const entityVersion = await tx.query.entityVersions.findFirst({
			where: { id },
			columns: { id: true, entityId: true },
		});

		assert(entityVersion);

		const documentId = entityVersion.entityId;
		const documentDescriptor = await getWebsiteDocumentDescriptorByEntityId(documentId);

		const entityFields = await tx
			.select({ id: schema.fields.id })
			.from(schema.fields)
			.where(eq(schema.fields.entityVersionId, entityVersion.id));

		if (entityFields.length > 0) {
			const fieldIds = entityFields.map((f) => {
				return f.id;
			});

			await tx.delete(schema.contentBlocks).where(inArray(schema.contentBlocks.fieldId, fieldIds));
			await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
		}

		await tx
			.delete(schema.entitiesToResources)
			.where(eq(schema.entitiesToResources.entityId, documentId));

		await tx
			.delete(schema.entitiesToEntities)
			.where(
				or(
					eq(schema.entitiesToEntities.entityId, documentId),
					eq(schema.entitiesToEntities.relatedEntityId, documentId),
				),
			);

		await tx.delete(schema.news).where(eq(schema.news.id, entityVersion.id));
		await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, entityVersion.id));
		await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));

		return documentDescriptor;
	});

	after(async () => {
		if (descriptor != null) {
			await deleteWebsiteDocument(descriptor);
		}

		await dispatchWebhook({ type: "news" });
	});

	revalidatePath("/[locale]/dashboard/website/news", "layout");
}
