/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { currentEntityVersionWhere } from "@/lib/data/current-entity-version";
import { db } from "@/lib/db";
import { and, count, desc, eq, ilike, sql } from "@/lib/db/sql";

export type InternalPagesSort = "title" | "updatedAt";

interface GetInternalPagesParams {
	limit?: number;
	offset?: number;
	q?: string;
	sort?: InternalPagesSort;
	dir?: "asc" | "desc";
}

export async function getInternalPages(params: GetInternalPagesParams) {
	const { limit = 10, offset = 0, q, sort = "updatedAt", dir = "desc" } = params;
	const query = q?.trim();
	const searchWhere =
		query != null && query !== "" ? ilike(schema.internalPages.title, `%${query}%`) : undefined;
	const where = and(currentEntityVersionWhere(), searchWhere);
	const orderBy =
		sort === "title"
			? dir === "asc"
				? schema.internalPages.title
				: desc(schema.internalPages.title)
			: dir === "asc"
				? schema.entityVersions.updatedAt
				: desc(schema.entityVersions.updatedAt);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				id: schema.internalPages.id,
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
				title: schema.internalPages.title,
				updatedAt: schema.entityVersions.updatedAt,
			})
			.from(schema.internalPages)
			.innerJoin(schema.entityVersions, eq(schema.internalPages.id, schema.entityVersions.id))
			.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.internalPages)
			.innerJoin(schema.entityVersions, eq(schema.internalPages.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(where),
	]);

	return {
		data: items.map((item) => {
			return {
				id: item.id,
				entity: { slug: item.slug },
				hasDraft: item.hasDraft,
				isPublished: item.isPublished,
				title: item.title,
				updatedAt: item.updatedAt,
			};
		}),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}
