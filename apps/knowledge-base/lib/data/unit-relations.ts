import { and, eq, inArray } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getUnitRelations(unitId: string) {
	return db
		.select({
			id: schema.organisationalUnitsRelations.id,
			duration: schema.organisationalUnitsRelations.duration,
			statusId: schema.organisationalUnitsRelations.status,
			statusType: schema.organisationalUnitStatus.status,
			relatedUnitId: schema.organisationalUnitsRelations.relatedUnitId,
			relatedUnitName: schema.organisationalUnits.name,
		})
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.innerJoin(
			schema.organisationalUnits,
			eq(schema.organisationalUnits.id, schema.organisationalUnitsRelations.relatedUnitId),
		)
		.where(eq(schema.organisationalUnitsRelations.unitId, unitId));
}

export type UnitRelation = Awaited<ReturnType<typeof getUnitRelations>>[number];

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getUnitRelationOptions(unitType: string) {
	const allowedCombos = await db
		.select({
			statusId: schema.organisationalUnitStatus.id,
			statusType: schema.organisationalUnitStatus.status,
			relatedUnitTypeId: schema.organisationalUnitsAllowedRelations.relatedUnitTypeId,
		})
		.from(schema.organisationalUnitsAllowedRelations)
		.innerJoin(
			schema.organisationalUnitTypes,
			and(
				eq(
					schema.organisationalUnitTypes.id,
					schema.organisationalUnitsAllowedRelations.unitTypeId,
				),
				eq(
					schema.organisationalUnitTypes.type,
					unitType as typeof schema.organisationalUnitTypes.$inferSelect.type,
				),
			),
		)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(
				schema.organisationalUnitStatus.id,
				schema.organisationalUnitsAllowedRelations.relationTypeId,
			),
		);

	if (allowedCombos.length === 0) return [];

	const relatedUnitTypeIds = [
		...new Set(
			allowedCombos.map((c) => {
				return c.relatedUnitTypeId;
			}),
		),
	];

	const relatedUnits = await db
		.select({
			id: schema.organisationalUnits.id,
			name: schema.organisationalUnits.name,
			typeId: schema.organisationalUnits.typeId,
		})
		.from(schema.organisationalUnits)
		.where(inArray(schema.organisationalUnits.typeId, relatedUnitTypeIds));

	const byStatus = new Map<
		string,
		{ statusId: string; statusType: string; availableUnits: Array<{ id: string; name: string }> }
	>();

	for (const combo of allowedCombos) {
		if (!byStatus.has(combo.statusId)) {
			byStatus.set(combo.statusId, {
				statusId: combo.statusId,
				statusType: combo.statusType,
				availableUnits: [],
			});
		}

		const entry = byStatus.get(combo.statusId)!;

		for (const unit of relatedUnits) {
			if (
				unit.typeId === combo.relatedUnitTypeId &&
				!entry.availableUnits.some((u) => {
					return u.id === unit.id;
				})
			) {
				entry.availableUnits.push({ id: unit.id, name: unit.name });
			}
		}
	}

	return Array.from(byStatus.values()).map((entry) => {
		return {
			...entry,
			availableUnits: entry.availableUnits.sort((a, b) => {
				return a.name.localeCompare(b.name);
			}),
		};
	});
}

export type UnitRelationOption = Awaited<ReturnType<typeof getUnitRelationOptions>>[number];
