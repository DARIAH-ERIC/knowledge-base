"use server";

import { eq, inArray, or } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAuthenticated } from "@/lib/auth/session";

export async function deleteImpactCaseStudyAction(id: string): Promise<void> {
	await assertAuthenticated();

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

		await tx
			.delete(schema.impactCaseStudiesToPersons)
			.where(eq(schema.impactCaseStudiesToPersons.impactCaseStudyId, id));

		await tx.delete(schema.impactCaseStudies).where(eq(schema.impactCaseStudies.id, id));

		await tx.delete(schema.entities).where(eq(schema.entities.id, id));
	});

	revalidatePath("/[locale]/dashboard/website/impact-case-studies", "layout");
}
