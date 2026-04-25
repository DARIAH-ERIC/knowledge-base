import { and, count, desc, eq, ilike, inArray } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

export type WorkingGroupsSort = "name";

interface GetWorkingGroupsParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: WorkingGroupsSort;
	dir?: "asc" | "desc";
}

export interface WorkingGroupsResult {
	data: Array<
		Pick<schema.OrganisationalUnit, "id" | "name"> & {
			durationFrom: Date | null;
			durationUntil: Date | null;
			entity: Pick<schema.Entity, "slug">;
		}
	>;
	limit: number;
	offset: number;
	total: number;
}

export async function getWorkingGroups(
	params: Readonly<GetWorkingGroupsParams>,
): Promise<WorkingGroupsResult> {
	const { limit, offset, q, dir = "asc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== ""
			? and(
					eq(
						schema.organisationalUnitTypes.type,
						"working_group" as typeof schema.organisationalUnitTypes.$inferSelect.type,
					),
					ilike(schema.organisationalUnits.name, `%${query}%`),
				)
			: eq(
					schema.organisationalUnitTypes.type,
					"working_group" as typeof schema.organisationalUnitTypes.$inferSelect.type,
				);

	const orderBy =
		dir === "desc" ? desc(schema.organisationalUnits.name) : schema.organisationalUnits.name;

	const [items, aggregate, erics] = await Promise.all([
		db
			.select({
				id: schema.organisationalUnits.id,
				name: schema.organisationalUnits.name,
				slug: schema.entities.slug,
			})
			.from(schema.organisationalUnits)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.innerJoin(schema.entities, eq(schema.organisationalUnits.id, schema.entities.id))
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.organisationalUnits)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.innerJoin(schema.entities, eq(schema.organisationalUnits.id, schema.entities.id))
			.where(where),
		db.query.organisationalUnits.findMany({
			where: { type: { type: "eric" } },
			columns: { id: true },
		}),
	]);

	const workingGroupIds = items.map((item) => {
		return item.id;
	});
	const ericIds = erics.map((eric) => {
		return eric.id;
	});

	let relationByWorkingGroupId = new Map<string, { from: Date; until: Date | null }>();

	if (workingGroupIds.length > 0 && ericIds.length > 0) {
		const relations = await db
			.select({
				duration: schema.organisationalUnitsRelations.duration,
				unitId: schema.organisationalUnitsRelations.unitId,
			})
			.from(schema.organisationalUnitsRelations)
			.innerJoin(
				schema.organisationalUnitStatus,
				eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
			)
			.where(
				and(
					inArray(schema.organisationalUnitsRelations.unitId, workingGroupIds),
					inArray(schema.organisationalUnitsRelations.relatedUnitId, ericIds),
					eq(schema.organisationalUnitStatus.status, "is_part_of"),
				),
			);

		relationByWorkingGroupId = new Map();

		for (const relation of relations) {
			const existing = relationByWorkingGroupId.get(relation.unitId);
			const nextRelation = {
				from: relation.duration.start,
				until: relation.duration.end ?? null,
			};

			if (existing == null) {
				relationByWorkingGroupId.set(relation.unitId, nextRelation);
				continue;
			}

			const shouldReplace =
				(existing.until != null && nextRelation.until == null) || nextRelation.from > existing.from;

			if (shouldReplace) {
				relationByWorkingGroupId.set(relation.unitId, nextRelation);
			}
		}
	}

	return {
		data: items.map((item) => {
			const relation = relationByWorkingGroupId.get(item.id);

			return {
				durationFrom: relation?.from ?? null,
				durationUntil: relation?.until ?? null,
				entity: { slug: item.slug },
				id: item.id,
				name: item.name,
			};
		}),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}
