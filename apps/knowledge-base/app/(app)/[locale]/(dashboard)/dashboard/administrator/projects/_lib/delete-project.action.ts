"use server";

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

export async function deleteProjectAction(id: string): Promise<void> {
	await assertAdmin();
	const descriptor = await getWebsiteDocumentDescriptorByEntityId(id);

	await db.transaction(async (tx) => {
		const partners = await tx
			.select({ id: schema.projectsToOrganisationalUnits.id })
			.from(schema.projectsToOrganisationalUnits)
			.where(eq(schema.projectsToOrganisationalUnits.projectId, id));

		if (partners.length > 0) {
			const partnerIds = partners.map((p) => {
				return p.id;
			});

			await tx
				.delete(schema.projectsToOrganisationalUnits)
				.where(inArray(schema.projectsToOrganisationalUnits.id, partnerIds));
		}

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

		await tx.delete(schema.projects).where(eq(schema.projects.id, id));

		await tx.delete(schema.entities).where(eq(schema.entities.id, id));
	});

	after(async () => {
		if (descriptor != null) {
			await deleteWebsiteDocument(descriptor);
		}
	});

	revalidatePath("/[locale]/dashboard/administrator/projects", "layout");
}
