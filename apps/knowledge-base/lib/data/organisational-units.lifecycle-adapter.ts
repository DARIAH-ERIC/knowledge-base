import * as schema from "@dariah-eric/database/schema";

import type { EntityLifecycleAdapter } from "@/lib/data/entity-lifecycle";
import { eq, or } from "@/lib/db/sql";

export const organisationalUnitsLifecycleAdapter: EntityLifecycleAdapter = {
	async cloneSubtype(tx, sourceVersionId, targetVersionId) {
		const [source] = await tx
			.select({
				acronym: schema.organisationalUnits.acronym,
				imageId: schema.organisationalUnits.imageId,
				name: schema.organisationalUnits.name,
				summary: schema.organisationalUnits.summary,
				typeId: schema.organisationalUnits.typeId,
			})
			.from(schema.organisationalUnits)
			.where(eq(schema.organisationalUnits.id, sourceVersionId))
			.limit(1);
		if (source == null) {return;}
		await tx.insert(schema.organisationalUnits).values({ id: targetVersionId, ...source });

		const relations = await tx
			.select({
				relatedUnitId: schema.organisationalUnitsRelations.relatedUnitId,
				duration: schema.organisationalUnitsRelations.duration,
				status: schema.organisationalUnitsRelations.status,
			})
			.from(schema.organisationalUnitsRelations)
			.where(eq(schema.organisationalUnitsRelations.unitId, sourceVersionId));

		if (relations.length > 0) {
			await tx.insert(schema.organisationalUnitsRelations).values(
				relations.map((r) => {
					return { unitId: targetVersionId, ...r };
				}),
			);
		}
	},

	async wipeSubtype(tx, versionId) {
		await tx
			.delete(schema.organisationalUnitsRelations)
			.where(
				or(
					eq(schema.organisationalUnitsRelations.unitId, versionId),
					eq(schema.organisationalUnitsRelations.relatedUnitId, versionId),
				),
			);
		await tx.delete(schema.organisationalUnits).where(eq(schema.organisationalUnits.id, versionId));
	},
};
