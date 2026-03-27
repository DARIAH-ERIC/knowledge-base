"use server";

import { eq, inArray, or } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAuthenticated } from "@/lib/auth/session";

export async function deleteProjectAction(id: string): Promise<void> {
	await assertAuthenticated();

	await db.transaction(async (tx) => {
		const partners = await tx
			.select({ id: schema.projectPartners.id })
			.from(schema.projectPartners)
			.where(eq(schema.projectPartners.projectId, id));

		if (partners.length > 0) {
			const partnerIds = partners.map((p) => {
				return p.id;
			});

			await tx
				.delete(schema.projectsContributions)
				.where(inArray(schema.projectsContributions.projectPartnerId, partnerIds));

			await tx.delete(schema.projectPartners).where(inArray(schema.projectPartners.id, partnerIds));
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

	revalidatePath("/[locale]/dashboard/administrator/projects", "layout");
}
