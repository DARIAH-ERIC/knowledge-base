"use server";

import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { eq, inArray, or } from "@dariah-eric/database/sql";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { assertAuthenticated } from "@/lib/auth/session";
import {
	deleteWebsiteDocument,
	getWebsiteDocumentDescriptorByEntityId,
} from "@/lib/search/website-index";

export async function deleteNewsItemAction(id: string): Promise<void> {
	await assertAuthenticated();
	const descriptor = await getWebsiteDocumentDescriptorByEntityId(id);

	await db.transaction(async (tx) => {
		const entityFields = await tx
			.select({ id: schema.fields.id })
			.from(schema.fields)
			.where(eq(schema.fields.entityId, id));

		if (entityFields.length > 0) {
			const fieldIds = entityFields.map((f) => {
				return f.id;
			});

			await tx.delete(schema.contentBlocks).where(inArray(schema.contentBlocks.fieldId, fieldIds));
			await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
		}

		await tx.delete(schema.entitiesToResources).where(eq(schema.entitiesToResources.entityId, id));

		await tx
			.delete(schema.entitiesToEntities)
			.where(
				or(
					eq(schema.entitiesToEntities.entityId, id),
					eq(schema.entitiesToEntities.relatedEntityId, id),
				),
			);

		await tx.delete(schema.news).where(eq(schema.news.id, id));

		await tx.delete(schema.entities).where(eq(schema.entities.id, id));
	});

	after(async () => {
		if (descriptor != null) {
			await deleteWebsiteDocument(descriptor);
		}
	});

	revalidatePath("/[locale]/dashboard/website/news", "layout");
}
