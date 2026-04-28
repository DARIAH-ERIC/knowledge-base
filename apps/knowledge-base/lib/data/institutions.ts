import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { and, count, desc, eq, ilike, inArray, sql } from "@/lib/db/sql";

export type InstitutionEricRelationStatus =
	| "is_cooperating_partner_of"
	| "is_national_coordinating_institution_in"
	| "is_national_representative_institution_in"
	| "is_partner_institution_of";

export type InstitutionsSort = "name" | "country" | "status";

interface GetInstitutionsParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: InstitutionsSort;
	dir?: "asc" | "desc";
}

export interface InstitutionsResult {
	data: Array<
		Pick<schema.OrganisationalUnit, "id" | "name"> & {
			countryName: string | null;
			ericRelationStatuses: Array<InstitutionEricRelationStatus>;
			entity: Pick<schema.Entity, "slug">;
		}
	>;
	limit: number;
	offset: number;
	total: number;
}

const institutionType = "institution" as typeof schema.organisationalUnitTypes.$inferSelect.type;
const institutionStatuses = [
	"is_partner_institution_of",
	"is_cooperating_partner_of",
	"is_national_coordinating_institution_in",
	"is_national_representative_institution_in",
] as const satisfies Array<InstitutionEricRelationStatus>;
const institutionStatusLabels: Record<InstitutionEricRelationStatus, string> = {
	is_cooperating_partner_of: "Cooperating partner",
	is_national_coordinating_institution_in: "National coordinating institution",
	is_national_representative_institution_in: "National representative institution",
	is_partner_institution_of: "Partner institution",
};

function compareStrings(a: string, b: string, dir: "asc" | "desc"): number {
	return dir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
}

function compareNullableStrings(a: string | null, b: string | null, dir: "asc" | "desc"): number {
	if (a == null && b == null) return 0;
	if (a == null) return 1;
	if (b == null) return -1;
	return compareStrings(a, b, dir);
}

function normalizeInstitutionStatuses(
	statuses: ReadonlyArray<InstitutionEricRelationStatus>,
): Array<InstitutionEricRelationStatus> {
	return institutionStatuses.filter((status) => {
		return statuses.includes(status);
	});
}

function getInstitutionStatusSortValue(
	statuses: ReadonlyArray<InstitutionEricRelationStatus>,
): string | null {
	const normalizedStatuses = normalizeInstitutionStatuses(statuses);

	if (normalizedStatuses.length === 0) {
		return null;
	}

	return normalizedStatuses
		.map((status) => {
			return institutionStatusLabels[status];
		})
		.join(" | ");
}

async function getInstitutionRelationData(ids: ReadonlyArray<string>) {
	if (ids.length === 0) {
		return {
			countryNameByInstitutionId: new Map<string, string>(),
			statusesByInstitutionId: new Map<string, Array<InstitutionEricRelationStatus>>(),
		};
	}

	const erics = await db.query.organisationalUnits.findMany({
		where: { type: { type: "eric" } },
		columns: { id: true },
	});
	const ericIds = erics.map((eric) => {
		return eric.id;
	});

	const [relations, countries] = await Promise.all([
		ericIds.length > 0
			? db
					.select({
						status: schema.organisationalUnitStatus.status,
						unitId: schema.organisationalUnitsRelations.unitId,
					})
					.from(schema.organisationalUnitsRelations)
					.innerJoin(
						schema.organisationalUnitStatus,
						eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
					)
					.where(
						and(
							inArray(schema.organisationalUnitsRelations.unitId, [...ids]),
							inArray(schema.organisationalUnitsRelations.relatedUnitId, ericIds),
							inArray(schema.organisationalUnitStatus.status, institutionStatuses),
							sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
						),
					)
			: Promise.resolve([]),
		db
			.select({
				countryName: schema.organisationalUnits.name,
				unitId: schema.organisationalUnitsRelations.unitId,
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
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.where(
				and(
					inArray(schema.organisationalUnitsRelations.unitId, [...ids]),
					eq(schema.organisationalUnitStatus.status, "is_located_in"),
					eq(
						schema.organisationalUnitTypes.type,
						"country" as typeof schema.organisationalUnitTypes.$inferSelect.type,
					),
					sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
				),
			),
	]);

	const statusesByInstitutionId = new Map<string, Array<InstitutionEricRelationStatus>>();
	const countryNameByInstitutionId = new Map<string, string>();

	for (const relation of relations) {
		const status = relation.status as InstitutionEricRelationStatus;
		const existing = statusesByInstitutionId.get(relation.unitId) ?? [];

		if (!existing.includes(status)) {
			existing.push(status);
			statusesByInstitutionId.set(relation.unitId, existing);
		}
	}

	for (const [institutionId, statuses] of statusesByInstitutionId.entries()) {
		statusesByInstitutionId.set(institutionId, normalizeInstitutionStatuses(statuses));
	}

	for (const country of countries) {
		if (!countryNameByInstitutionId.has(country.unitId)) {
			countryNameByInstitutionId.set(country.unitId, country.countryName);
		}
	}

	return { countryNameByInstitutionId, statusesByInstitutionId };
}

export async function getInstitutions(
	params: Readonly<GetInstitutionsParams>,
): Promise<InstitutionsResult> {
	const { limit, offset, q, sort = "name", dir = "asc" } = params;
	const query = q?.trim();
	const nameOrderBy =
		dir === "desc" ? desc(schema.organisationalUnits.name) : schema.organisationalUnits.name;
	const needsDerivedSort = sort === "country" || sort === "status";

	if ((query == null || query === "") && !needsDerivedSort) {
		const where = eq(schema.organisationalUnitTypes.type, institutionType);
		const [items, aggregate] = await Promise.all([
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
				.orderBy(nameOrderBy)
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
		]);
		const institutionIds = items.map((item) => {
			return item.id;
		});
		const { countryNameByInstitutionId, statusesByInstitutionId } =
			await getInstitutionRelationData(institutionIds);

		return {
			data: items.map((institution) => {
				return {
					countryName: countryNameByInstitutionId.get(institution.id) ?? null,
					entity: { slug: institution.slug },
					ericRelationStatuses: statusesByInstitutionId.get(institution.id) ?? [],
					id: institution.id,
					name: institution.name,
				};
			}),
			limit,
			offset,
			total: aggregate.at(0)?.total ?? 0,
		};
	}

	let items: Array<{ id: string; name: string; slug: string }> = [];
	let total = 0;

	if (query == null || query === "") {
		const where = eq(schema.organisationalUnitTypes.type, institutionType);
		items = await db
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
			.orderBy(nameOrderBy);
		total = items.length;
	} else {
		const matchingStatuses = institutionStatuses.filter((status) => {
			return institutionStatusLabels[status].toLowerCase().includes(query.toLowerCase());
		});

		const [nameMatches, countryMatches, statusMatches] = await Promise.all([
			db
				.select({ id: schema.organisationalUnits.id })
				.from(schema.organisationalUnits)
				.innerJoin(
					schema.organisationalUnitTypes,
					eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
				)
				.where(
					and(
						eq(schema.organisationalUnitTypes.type, institutionType),
						ilike(schema.organisationalUnits.name, `%${query}%`),
					),
				),
			db
				.select({ id: schema.organisationalUnitsRelations.unitId })
				.from(schema.organisationalUnitsRelations)
				.innerJoin(
					schema.organisationalUnitStatus,
					eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
				)
				.innerJoin(
					schema.organisationalUnits,
					eq(schema.organisationalUnits.id, schema.organisationalUnitsRelations.relatedUnitId),
				)
				.innerJoin(
					schema.organisationalUnitTypes,
					eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
				)
				.where(
					and(
						eq(schema.organisationalUnitStatus.status, "is_located_in"),
						eq(
							schema.organisationalUnitTypes.type,
							"country" as typeof schema.organisationalUnitTypes.$inferSelect.type,
						),
						ilike(schema.organisationalUnits.name, `%${query}%`),
						sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
					),
				),
			matchingStatuses.length > 0
				? db
						.select({ id: schema.organisationalUnitsRelations.unitId })
						.from(schema.organisationalUnitsRelations)
						.innerJoin(
							schema.organisationalUnitStatus,
							eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
						)
						.where(
							and(
								inArray(schema.organisationalUnitStatus.status, matchingStatuses),
								sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
							),
						)
				: Promise.resolve([]),
		]);

		const matchedIds = Array.from(
			new Set([
				...nameMatches.map((item) => {
					return item.id;
				}),
				...countryMatches.map((item) => {
					return item.id;
				}),
				...statusMatches.map((item) => {
					return item.id;
				}),
			]),
		);

		if (matchedIds.length === 0) {
			return { data: [], limit, offset, total: 0 };
		}

		items = await db
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
			.where(
				and(
					eq(schema.organisationalUnitTypes.type, institutionType),
					inArray(schema.organisationalUnits.id, matchedIds),
				),
			)
			.orderBy(nameOrderBy);
		total = items.length;
	}

	if (!needsDerivedSort) {
		const pagedItems = items.slice(offset, offset + limit);
		const { countryNameByInstitutionId, statusesByInstitutionId } =
			await getInstitutionRelationData(
				pagedItems.map((item) => {
					return item.id;
				}),
			);

		return {
			data: pagedItems.map((institution) => {
				return {
					countryName: countryNameByInstitutionId.get(institution.id) ?? null,
					entity: { slug: institution.slug },
					ericRelationStatuses: statusesByInstitutionId.get(institution.id) ?? [],
					id: institution.id,
					name: institution.name,
				};
			}),
			limit,
			offset,
			total,
		};
	}

	const { countryNameByInstitutionId, statusesByInstitutionId } = await getInstitutionRelationData(
		items.map((item) => {
			return item.id;
		}),
	);
	const sortedItems = items
		.map((institution) => {
			return {
				countryName: countryNameByInstitutionId.get(institution.id) ?? null,
				entity: { slug: institution.slug },
				ericRelationStatuses: statusesByInstitutionId.get(institution.id) ?? [],
				id: institution.id,
				name: institution.name,
			};
		})
		.sort((a, b) => {
			if (sort === "country") {
				return (
					compareNullableStrings(a.countryName, b.countryName, dir) ||
					compareStrings(a.name, b.name, dir)
				);
			}

			return (
				compareNullableStrings(
					getInstitutionStatusSortValue(a.ericRelationStatuses),
					getInstitutionStatusSortValue(b.ericRelationStatuses),
					dir,
				) || compareStrings(a.name, b.name, dir)
			);
		});

	return {
		data: sortedItems.slice(offset, offset + limit),
		limit,
		offset,
		total,
	};
}
