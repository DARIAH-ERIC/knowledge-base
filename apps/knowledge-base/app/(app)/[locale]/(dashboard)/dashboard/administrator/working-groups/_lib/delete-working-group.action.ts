"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq, inArray, or } from "@/lib/db/sql";

export async function deleteWorkingGroupAction(id: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await tx
			.delete(schema.organisationalUnitsRelations)
			.where(
				or(
					eq(schema.organisationalUnitsRelations.unitId, id),
					eq(schema.organisationalUnitsRelations.relatedUnitId, id),
				),
			);

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

		await tx.delete(schema.organisationalUnits).where(eq(schema.organisationalUnits.id, id));

		await tx.delete(schema.entities).where(eq(schema.entities.id, id));
	});

	revalidatePath("/[locale]/dashboard/administrator/working-groups", "layout");
}
