import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { and, count, desc, eq, ilike, inArray } from "@/lib/db/sql";

export type NationalConsortiaSort = "name" | "country";

interface GetNationalConsortiaParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: NationalConsortiaSort;
	dir?: "asc" | "desc";
}

export interface NationalConsortiaResult {
	data: Array<
		Pick<schema.OrganisationalUnit, "id" | "name"> & {
			countryName: string | null;
			entity: Pick<schema.Entity, "slug">;
		}
	>;
	limit: number;
	offset: number;
	total: number;
}

function compareStrings(a: string, b: string, dir: "asc" | "desc"): number {
	return dir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
}

function compareNullableStrings(a: string | null, b: string | null, dir: "asc" | "desc"): number {
	if (a == null && b == null) return 0;
	if (a == null) return 1;
	if (b == null) return -1;
	return compareStrings(a, b, dir);
}

async function getCountryNamesByUnitIds(
	ids: ReadonlyArray<string>,
): Promise<Map<string, string | null>> {
	if (ids.length === 0) {
		return new Map();
	}

	const relatedCountries = await db
		.select({
			countryName: schema.organisationalUnits.name,
			duration: schema.organisationalUnitsRelations.duration,
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
				eq(schema.organisationalUnitStatus.status, "is_national_consortium_of"),
				eq(
					schema.organisationalUnitTypes.type,
					"country" as typeof schema.organisationalUnitTypes.$inferSelect.type,
				),
			),
		);

	const countryByUnitId = new Map<string, { from: Date; name: string; until: Date | null }>();

	for (const relation of relatedCountries) {
		const existing = countryByUnitId.get(relation.unitId);
		const nextRelation = {
			from: relation.duration.start,
			name: relation.countryName,
			until: relation.duration.end ?? null,
		};

		if (existing == null) {
			countryByUnitId.set(relation.unitId, nextRelation);
			continue;
		}

		const shouldReplace =
			(existing.until != null && nextRelation.until == null) || nextRelation.from > existing.from;

		if (shouldReplace) {
			countryByUnitId.set(relation.unitId, nextRelation);
		}
	}

	return new Map(
		ids.map((id) => {
			return [id, countryByUnitId.get(id)?.name ?? null] as const;
		}),
	);
}

export async function getNationalConsortia(
	params: Readonly<GetNationalConsortiaParams>,
): Promise<NationalConsortiaResult> {
	const { limit, offset, q, sort = "name", dir = "asc" } = params;
	const query = q?.trim();
	const consortiumType =
		"national_consortium" as typeof schema.organisationalUnitTypes.$inferSelect.type;
	const nameOrderBy =
		dir === "desc" ? desc(schema.organisationalUnits.name) : schema.organisationalUnits.name;

	if (query == null || query === "") {
		const where = eq(schema.organisationalUnitTypes.type, consortiumType);
		const [items, aggregate] = await Promise.all([
			sort === "country"
				? db
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
				: db
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

		if (sort !== "country") {
			const countryNames = await getCountryNamesByUnitIds(
				items.map((item) => {
					return item.id;
				}),
			);

			return {
				data: items.map((item) => {
					return {
						countryName: countryNames.get(item.id) ?? null,
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

		const countryNames = await getCountryNamesByUnitIds(
			items.map((item) => {
				return item.id;
			}),
		);
		const sortedItems = items
			.map((item) => {
				return {
					countryName: countryNames.get(item.id) ?? null,
					entity: { slug: item.slug },
					id: item.id,
					name: item.name,
				};
			})
			.sort((a, b) => {
				return (
					compareNullableStrings(a.countryName, b.countryName, dir) ||
					compareStrings(a.name, b.name, dir)
				);
			});

		return {
			data: sortedItems.slice(offset, offset + limit),
			limit,
			offset,
			total: aggregate.at(0)?.total ?? 0,
		};
	}

	const [nameMatches, countryMatches] = await Promise.all([
		db
			.select({ id: schema.organisationalUnits.id })
			.from(schema.organisationalUnits)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(
				and(
					eq(schema.organisationalUnitTypes.type, consortiumType),
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
					eq(schema.organisationalUnitStatus.status, "is_national_consortium_of"),
					eq(
						schema.organisationalUnitTypes.type,
						"country" as typeof schema.organisationalUnitTypes.$inferSelect.type,
					),
					ilike(schema.organisationalUnits.name, `%${query}%`),
				),
			),
	]);

	const matchedIds = Array.from(
		new Set([
			...nameMatches.map((item) => {
				return item.id;
			}),
			...countryMatches.map((item) => {
				return item.id;
			}),
		]),
	);

	if (matchedIds.length === 0) {
		return { data: [], limit, offset, total: 0 };
	}

	const orderedItems = await db
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
				eq(schema.organisationalUnitTypes.type, consortiumType),
				inArray(schema.organisationalUnits.id, matchedIds),
			),
		)
		.orderBy(nameOrderBy);

	if (sort !== "country") {
		const pagedItems = orderedItems.slice(offset, offset + limit);
		const countryNames = await getCountryNamesByUnitIds(
			pagedItems.map((item) => {
				return item.id;
			}),
		);

		return {
			data: pagedItems.map((item) => {
				return {
					countryName: countryNames.get(item.id) ?? null,
					entity: { slug: item.slug },
					id: item.id,
					name: item.name,
				};
			}),
			limit,
			offset,
			total: orderedItems.length,
		};
	}

	const countryNames = await getCountryNamesByUnitIds(
		orderedItems.map((item) => {
			return item.id;
		}),
	);
	const sortedItems = orderedItems
		.map((item) => {
			return {
				countryName: countryNames.get(item.id) ?? null,
				entity: { slug: item.slug },
				id: item.id,
				name: item.name,
			};
		})
		.sort((a, b) => {
			return (
				compareNullableStrings(a.countryName, b.countryName, dir) ||
				compareStrings(a.name, b.name, dir)
			);
		});

	return {
		data: sortedItems.slice(offset, offset + limit),
		limit,
		offset,
		total: orderedItems.length,
	};
}
