import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { forbidden } from "next/navigation";

import { db } from "@/lib/db";
import { and, count, desc, eq, ilike, or, sql } from "@/lib/db/sql";

export type GovernanceBodiesSort = "acronym" | "name";

interface GetGovernanceBodiesParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: GovernanceBodiesSort;
	dir?: "asc" | "desc";
}

export interface GovernanceBodiesResult {
	data: Array<
		Pick<schema.OrganisationalUnit, "acronym" | "id" | "name"> & {
			documentId: string;
			entity: Pick<schema.Entity, "slug">;
			hasDraft: boolean;
			isPublished: boolean;
			updatedAt: Date;
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

export async function getGovernanceBodies(
	params: Readonly<GetGovernanceBodiesParams>,
): Promise<GovernanceBodiesResult> {
	const { limit, offset, q, sort = "name", dir = "asc" } = params;
	const query = q?.trim();
	const governanceBodyType =
		"governance_body" as typeof schema.organisationalUnitTypes.$inferSelect.type;
	const where =
		query != null && query !== ""
			? and(
					eq(schema.organisationalUnitTypes.type, governanceBodyType),
					or(
						ilike(schema.organisationalUnits.acronym, `%${query}%`),
						ilike(schema.organisationalUnits.name, `%${query}%`),
					),
				)
			: eq(schema.organisationalUnitTypes.type, governanceBodyType);

	const orderBy =
		sort === "acronym"
			? dir === "asc"
				? sql`${schema.organisationalUnits.acronym} ASC NULLS LAST`
				: sql`${schema.organisationalUnits.acronym} DESC NULLS LAST`
			: dir === "asc"
				? schema.organisationalUnits.name
				: desc(schema.organisationalUnits.name);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				acronym: schema.organisationalUnits.acronym,
				documentId: schema.entities.id,
				id: schema.organisationalUnits.id,
				name: schema.organisationalUnits.name,
				slug: schema.entities.slug,
				updatedAt: schema.entityVersions.updatedAt,
				isPublished: sql<boolean>`
					EXISTS (
						SELECT
							1
						FROM
							"entity_versions" AS "pv"
							INNER JOIN "entity_status" AS "ps" ON "pv"."status_id" = "ps"."id"
						WHERE
							"pv"."entity_id" = ${schema.entityVersions.entityId}
							AND "ps"."type" = 'published'
					)
				`,
				hasDraft: sql<boolean>`
					EXISTS (
						SELECT 1
						FROM "entity_versions" AS "dv"
						INNER JOIN "entity_status" AS "ds" ON "dv"."status_id" = "ds"."id"
						WHERE
							"dv"."entity_id" = ${schema.entityVersions.entityId}
							AND "ds"."type" = 'draft'
							AND (
								NOT EXISTS (
									SELECT 1
									FROM "entity_versions" AS "pv"
									INNER JOIN "entity_status" AS "ps" ON "pv"."status_id" = "ps"."id"
									WHERE
										"pv"."entity_id" = ${schema.entityVersions.entityId}
										AND "ps"."type" = 'published'
								)
								OR "dv"."updated_at" > (
									SELECT "pv"."updated_at"
									FROM "entity_versions" AS "pv"
									INNER JOIN "entity_status" AS "ps" ON "pv"."status_id" = "ps"."id"
									WHERE
										"pv"."entity_id" = ${schema.entityVersions.entityId}
										AND "ps"."type" = 'published'
									LIMIT 1
								)
							)
					)
				`,
				status: schema.entityStatus.type,
			})
			.from(schema.organisationalUnits)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
			.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(
				and(
					or(
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
					),
					where,
				),
			)
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
			.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
			.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(
				and(
					or(
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
					),
					where,
				),
			),
	]);

	return {
		data: items.map((item) => {
			return {
				acronym: item.acronym,
				documentId: item.documentId,
				entity: { slug: item.slug },
				hasDraft: item.hasDraft,
				id: item.id,
				isPublished: item.isPublished,
				name: item.name,
				updatedAt: item.updatedAt,
			};
		}),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}

export async function getGovernanceBodiesForAdmin(
	currentUser: Pick<User, "role">,
	params: Readonly<GetGovernanceBodiesParams>,
): Promise<GovernanceBodiesResult> {
	assertAdminUser(currentUser);

	return getGovernanceBodies(params);
}
