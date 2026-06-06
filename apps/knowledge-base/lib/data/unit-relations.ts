import * as schema from "@dariah-eric/database/schema";

import { relationOptionsPageSize } from "@/lib/constants/relations";
import { publishedEntityVersionWhere } from "@/lib/data/current-entity-version";
import { db } from "@/lib/db";
import { alias, and, count, eq, ilike, inArray, sql } from "@/lib/db/sql";

/**
 * `unitDocumentId` is the owner unit's `entities.id`. Unit↔unit relations are document-level, so
 * there is a single set per unit document (no draft/published diff); the related unit is resolved
 * to its latest editable version for display.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getUnitRelations(unitDocumentId: string) {
	const relatedUnitDocumentLifecycle = alias(
		schema.documentLifecycle,
		"related_unit_document_lifecycle",
	);

	return db
		.select({
			id: schema.organisationalUnitsRelations.id,
			duration: schema.organisationalUnitsRelations.duration,
			statusId: schema.organisationalUnitsRelations.status,
			statusType: schema.organisationalUnitStatus.status,
			relatedUnitId: schema.organisationalUnitsRelations.relatedUnitDocumentId,
			relatedUnitName: schema.organisationalUnits.name,
			relatedUnitType: schema.organisationalUnitTypes.type,
		})
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.innerJoin(
			relatedUnitDocumentLifecycle,
			eq(
				relatedUnitDocumentLifecycle.documentId,
				schema.organisationalUnitsRelations.relatedUnitDocumentId,
			),
		)
		.innerJoin(
			schema.organisationalUnits,
			sql`${schema.organisationalUnits.id} = COALESCE(${relatedUnitDocumentLifecycle.draftId}, ${relatedUnitDocumentLifecycle.publishedId})`,
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.where(eq(schema.organisationalUnitsRelations.unitDocumentId, unitDocumentId))
		.orderBy(
			sql`UPPER(${schema.organisationalUnitsRelations.duration}) DESC NULLS FIRST`,
			sql`LOWER(${schema.organisationalUnitsRelations.duration}) DESC`,
		);
}

export type UnitRelation = Awaited<ReturnType<typeof getUnitRelations>>[number];

export interface UnitRelationStatusOption {
	statusId: string;
	statusType: string;
}

interface GetUnitRelationRelatedUnitOptionsParams {
	unitId: string;
	statusId: string;
	limit?: number;
	offset?: number;
	q?: string;
}

export async function getUnitRelationStatusOptions(
	unitType: string,
): Promise<Array<UnitRelationStatusOption>> {
	const rows = await db
		.select({
			statusId: schema.organisationalUnitStatus.id,
			statusType: schema.organisationalUnitStatus.status,
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
		)
		.orderBy(schema.organisationalUnitStatus.status);

	const byStatusId = new Map(rows.map((row) => [row.statusId, row] as const));

	return [...byStatusId.values()];
}

export async function getUnitRelationRelatedUnitOptions(
	params: GetUnitRelationRelatedUnitOptionsParams,
): Promise<{ items: Array<{ id: string; name: string }>; total: number }> {
	const { unitId, statusId, limit = relationOptionsPageSize, offset = 0, q } = params;
	const query = q?.trim();

	// `unitId` is the owner unit's document id; resolve it to its current version for the type.
	const currentUnit = await db
		.select({ typeId: schema.organisationalUnits.typeId })
		.from(schema.documentLifecycle)
		.innerJoin(
			schema.organisationalUnits,
			sql`${schema.organisationalUnits.id} = COALESCE(${schema.documentLifecycle.publishedId}, ${schema.documentLifecycle.draftId})`,
		)
		.where(eq(schema.documentLifecycle.documentId, unitId))
		.limit(1)
		.then((rows) => rows[0] ?? null);

	if (currentUnit == null) {
		return { items: [], total: 0 };
	}

	const allowedRelatedUnitTypes = await db
		.select({ relatedUnitTypeId: schema.organisationalUnitsAllowedRelations.relatedUnitTypeId })
		.from(schema.organisationalUnitsAllowedRelations)
		.where(
			and(
				eq(schema.organisationalUnitsAllowedRelations.unitTypeId, currentUnit.typeId),
				eq(schema.organisationalUnitsAllowedRelations.relationTypeId, statusId),
			),
		);

	const relatedUnitTypeIds = [
		...new Set(allowedRelatedUnitTypes.map((row) => row.relatedUnitTypeId)),
	];

	if (relatedUnitTypeIds.length === 0) {
		return { items: [], total: 0 };
	}

	const where = and(
		publishedEntityVersionWhere(),
		inArray(schema.organisationalUnits.typeId, relatedUnitTypeIds),
		query != null && query !== ""
			? ilike(schema.organisationalUnits.name, `%${query}%`)
			: undefined,
	);

	const [items, aggregate] = await Promise.all([
		db
			.select({ id: schema.entityVersions.entityId, name: schema.organisationalUnits.name })
			.from(schema.organisationalUnits)
			.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(where)
			.orderBy(schema.organisationalUnits.name)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.organisationalUnits)
			.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(where),
	]);

	return { items, total: aggregate.at(0)?.total ?? 0 };
}

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

	if (allowedCombos.length === 0) {
		return [];
	}

	const relatedUnitTypeIds = [...new Set(allowedCombos.map((c) => c.relatedUnitTypeId))];

	const relatedUnits = await db
		.select({
			id: schema.entityVersions.entityId,
			name: schema.organisationalUnits.name,
			typeId: schema.organisationalUnits.typeId,
		})
		.from(schema.organisationalUnits)
		.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.where(
			and(
				publishedEntityVersionWhere(),
				inArray(schema.organisationalUnits.typeId, relatedUnitTypeIds),
			),
		);

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
				!entry.availableUnits.some((u) => u.id === unit.id)
			) {
				entry.availableUnits.push({ id: unit.id, name: unit.name });
			}
		}
	}

	return Array.from(byStatus.values()).map((entry) => {
		return {
			...entry,
			availableUnits: entry.availableUnits.toSorted((a, b) => a.name.localeCompare(b.name)),
		};
	});
}

export type UnitRelationOption = Awaited<ReturnType<typeof getUnitRelationOptions>>[number];
