import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { forbidden } from "next/navigation";

import { db } from "@/lib/db";
import { and, count, desc, eq, ilike, inArray, or, sql } from "@/lib/db/sql";

export type CountryMemberObserverStatus = "is_member_of" | "is_observer_of" | null;

export type CountriesSort = "name" | "status";

interface GetCountriesParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: CountriesSort;
	dir?: "asc" | "desc";
}

export interface CountriesResult {
	data: Array<
		Pick<schema.OrganisationalUnit, "id" | "name"> & {
			memberObserverFrom: Date | null;
			memberObserverStatus: CountryMemberObserverStatus;
			memberObserverUntil: Date | null;
			entity: Pick<schema.Entity, "slug">;
			hasDraft: boolean;
			isPublished: boolean;
		}
	>;
	limit: number;
	offset: number;
	total: number;
}

function assertAdminUser(user: Pick<User, "role">): void {
	if (user.role !== "admin") {
		forbidden();
	}
}

function compareStrings(a: string, b: string, dir: "asc" | "desc"): number {
	return dir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
}

function compareNullableStrings(a: string | null, b: string | null, dir: "asc" | "desc"): number {
	if (a == null && b == null) {
		return 0;
	}
	if (a == null) {
		return 1;
	}
	if (b == null) {
		return -1;
	}
	return compareStrings(a, b, dir);
}

function getCountryStatusSortValue(status: CountryMemberObserverStatus): string | null {
	if (status == null) {
		return null;
	}

	return status === "is_member_of" ? "Member" : "Observer";
}

export async function getCountries(params: Readonly<GetCountriesParams>): Promise<CountriesResult> {
	const { limit, offset, q, sort = "name", dir = "asc" } = params;
	const query = q?.trim();
	const countryType = "country" as typeof schema.organisationalUnitTypes.$inferSelect.type;
	const where =
		query != null && query !== ""
			? and(
					eq(schema.organisationalUnitTypes.type, countryType),
					ilike(schema.organisationalUnits.name, `%${query}%`),
				)
			: eq(schema.organisationalUnitTypes.type, countryType);
	const nameOrderBy =
		dir === "desc" ? desc(schema.organisationalUnits.name) : schema.organisationalUnits.name;
	const needsDerivedSort = sort === "status";
	const lifecycleWhere = or(
		eq(schema.entityStatus.type, "draft"),
		and(
			eq(schema.entityStatus.type, "published"),
			sql`
				NOT EXISTS (
					SELECT
						1
					FROM
						"entity_versions" AS "ev2"
						INNER JOIN "entity_status" AS "es2" ON "ev2"."status_id" = "es2"."id"
					WHERE
						"ev2"."entity_id" = ${schema.entityVersions.entityId}
						AND "es2"."type" = 'draft'
				)
			`,
		),
	);

	const [items, aggregate, erics] = await Promise.all([
		needsDerivedSort
			? db
					.select({
						id: schema.organisationalUnits.id,
						name: schema.organisationalUnits.name,
						slug: schema.entities.slug,
						hasDraft: sql<boolean>`
							EXISTS (
								SELECT
									1
								FROM
									"entity_versions" AS "dv"
									INNER JOIN "entity_status" AS "ds" ON "dv"."status_id" = "ds"."id"
								WHERE
									"dv"."entity_id" = ${schema.entityVersions.entityId}
									AND "ds"."type" = 'draft'
									AND (
										NOT EXISTS (
											SELECT
												1
											FROM
												"entity_versions" AS "pv"
												INNER JOIN "entity_status" AS "ps" ON "pv"."status_id" = "ps"."id"
											WHERE
												"pv"."entity_id" = ${schema.entityVersions.entityId}
												AND "ps"."type" = 'published'
										)
										OR "dv"."updated_at" > (
											SELECT
												"pv"."updated_at"
											FROM
												"entity_versions" AS "pv"
												INNER JOIN "entity_status" AS "ps" ON "pv"."status_id" = "ps"."id"
											WHERE
												"pv"."entity_id" = ${schema.entityVersions.entityId}
												AND "ps"."type" = 'published'
											LIMIT 1
										)
									)
							)
						`,
						isPublished: sql<boolean>`EXISTS (
							SELECT 1 FROM "entity_versions" AS "published_versions"
							INNER JOIN "entity_status" AS "published_status" ON "published_versions"."status_id" = "published_status"."id"
							WHERE "published_versions"."entity_id" = ${schema.entities.id}
							AND "published_status"."type" = 'published'
						)`,
					})
					.from(schema.organisationalUnits)
					.innerJoin(
						schema.organisationalUnitTypes,
						eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
					)
					.innerJoin(
						schema.entityVersions,
						eq(schema.organisationalUnits.id, schema.entityVersions.id),
					)
					.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
					.innerJoin(
						schema.entityStatus,
						eq(schema.entityVersions.statusId, schema.entityStatus.id),
					)
					.where(and(lifecycleWhere, where))
					.orderBy(nameOrderBy)
			: db
					.select({
						id: schema.organisationalUnits.id,
						name: schema.organisationalUnits.name,
						slug: schema.entities.slug,
						hasDraft: sql<boolean>`
							EXISTS (
								SELECT
									1
								FROM
									"entity_versions" AS "dv"
									INNER JOIN "entity_status" AS "ds" ON "dv"."status_id" = "ds"."id"
								WHERE
									"dv"."entity_id" = ${schema.entityVersions.entityId}
									AND "ds"."type" = 'draft'
									AND (
										NOT EXISTS (
											SELECT
												1
											FROM
												"entity_versions" AS "pv"
												INNER JOIN "entity_status" AS "ps" ON "pv"."status_id" = "ps"."id"
											WHERE
												"pv"."entity_id" = ${schema.entityVersions.entityId}
												AND "ps"."type" = 'published'
										)
										OR "dv"."updated_at" > (
											SELECT
												"pv"."updated_at"
											FROM
												"entity_versions" AS "pv"
												INNER JOIN "entity_status" AS "ps" ON "pv"."status_id" = "ps"."id"
											WHERE
												"pv"."entity_id" = ${schema.entityVersions.entityId}
												AND "ps"."type" = 'published'
											LIMIT 1
										)
									)
							)
						`,
						isPublished: sql<boolean>`EXISTS (
							SELECT 1 FROM "entity_versions" AS "published_versions"
							INNER JOIN "entity_status" AS "published_status" ON "published_versions"."status_id" = "published_status"."id"
							WHERE "published_versions"."entity_id" = ${schema.entities.id}
							AND "published_status"."type" = 'published'
						)`,
					})
					.from(schema.organisationalUnits)
					.innerJoin(
						schema.organisationalUnitTypes,
						eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
					)
					.innerJoin(
						schema.entityVersions,
						eq(schema.organisationalUnits.id, schema.entityVersions.id),
					)
					.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
					.innerJoin(
						schema.entityStatus,
						eq(schema.entityVersions.statusId, schema.entityStatus.id),
					)
					.where(and(lifecycleWhere, where))
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
			.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
			.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(and(lifecycleWhere, where)),
		db.query.organisationalUnits.findMany({
			where: { type: { type: "eric" } },
			columns: { id: true },
		}),
	]);

	const countryIds = items.map((item) => item.id);
	const ericIds = erics.map((eric) => eric.id);
	let relationByCountryId = new Map<
		string,
		{ from: Date; status: Exclude<CountryMemberObserverStatus, null>; until: Date | null }
	>();

	if (countryIds.length > 0 && ericIds.length > 0) {
		const relations = await db
			.select({
				duration: schema.organisationalUnitsRelations.duration,
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
					inArray(schema.organisationalUnitsRelations.unitId, countryIds),
					inArray(schema.organisationalUnitsRelations.relatedUnitId, ericIds),
					inArray(schema.organisationalUnitStatus.status, ["is_member_of", "is_observer_of"]),
				),
			);

		relationByCountryId = new Map();

		for (const relation of relations) {
			const existing = relationByCountryId.get(relation.unitId);
			const nextRelation = {
				from: relation.duration.start,
				status: relation.status as Exclude<CountryMemberObserverStatus, null>,
				until: relation.duration.end ?? null,
			};

			if (existing == null) {
				relationByCountryId.set(relation.unitId, nextRelation);
				continue;
			}

			const shouldReplace =
				(existing.until != null && nextRelation.until == null) || nextRelation.from > existing.from;

			if (shouldReplace) {
				relationByCountryId.set(relation.unitId, nextRelation);
			}
		}
	}

	const data = items.map((item) => {
		const relation = relationByCountryId.get(item.id);

		return {
			entity: { slug: item.slug },
			id: item.id,
			memberObserverFrom: relation?.from ?? null,
			memberObserverStatus: relation?.status ?? null,
			memberObserverUntil: relation?.until ?? null,
			name: item.name,
			hasDraft: item.hasDraft,
			isPublished: item.isPublished,
		};
	});

	if (!needsDerivedSort) {
		return {
			data,
			limit,
			offset,
			total: aggregate.at(0)?.total ?? 0,
		};
	}

	const sortedData = [...data].toSorted(
		(a, b) =>
			compareNullableStrings(
				getCountryStatusSortValue(a.memberObserverStatus),
				getCountryStatusSortValue(b.memberObserverStatus),
				dir,
			) || compareStrings(a.name, b.name, dir),
	);

	return {
		data: sortedData.slice(offset, offset + limit),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}

export async function getCountriesForAdmin(
	currentUser: Pick<User, "role">,
	params: Readonly<GetCountriesParams>,
): Promise<CountriesResult> {
	assertAdminUser(currentUser);

	return getCountries(params);
}
