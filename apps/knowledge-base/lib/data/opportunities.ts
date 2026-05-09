/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { and, count, desc, eq, ilike, or, sql } from "@/lib/db/sql";

export type OpportunitiesSort = "title" | "source" | "updatedAt";

interface GetOpportunitiesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	q?: string;
	sort?: OpportunitiesSort;
	dir?: "asc" | "desc";
}

export async function getOpportunities(params: GetOpportunitiesParams) {
	const { limit = 10, offset = 0, q, sort = "updatedAt", dir = "desc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.opportunities.title, `%${query}%`) : undefined;
	const orderBy =
		sort === "title"
			? dir === "asc"
				? schema.opportunities.title
				: desc(schema.opportunities.title)
			: sort === "source"
				? dir === "asc"
					? schema.opportunitySources.source
					: desc(schema.opportunitySources.source)
				: dir === "asc"
					? schema.entityVersions.updatedAt
					: desc(schema.entityVersions.updatedAt);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				documentId: schema.entities.id,
				duration: schema.opportunities.duration,
				id: schema.opportunities.id,
				source: schema.opportunitySources.source,
				sourceId: schema.opportunities.sourceId,
				slug: schema.entities.slug,
				summary: schema.opportunities.summary,
				title: schema.opportunities.title,
				updatedAt: schema.entityVersions.updatedAt,
				website: schema.opportunities.website,
				isPublished: sql<boolean>`
					EXISTS (
						SELECT
							1
						FROM
							"entity_versions" AS "pv"
							INNER JOIN "entity_status" AS "ps" ON "pv"."status_id" = "ps"."id"
						WHERE
							"pv"."entity_id" = ${schema.entities.id}
							AND "ps"."type" = 'published'
					)
				`,
			})
			.from(schema.opportunities)
			.innerJoin(schema.entityVersions, eq(schema.opportunities.id, schema.entityVersions.id))
			.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
			.innerJoin(
				schema.opportunitySources,
				eq(schema.opportunities.sourceId, schema.opportunitySources.id),
			)
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
										"ev2"."entity_id" = ${schema.entities.id}
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
			.from(schema.opportunities)
			.innerJoin(schema.entityVersions, eq(schema.opportunities.id, schema.entityVersions.id))
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

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		return {
			documentId: item.documentId,
			duration: item.duration,
			id: item.id,
			sourceId: item.sourceId,
			source: {
				id: item.sourceId,
				source: item.source,
			},
			entity: { slug: item.slug },
			summary: item.summary,
			title: item.title,
			updatedAt: item.updatedAt,
			isPublished: item.isPublished,
			website: item.website,
		};
	});

	return { data, limit, offset, total };
}

interface GetOpportunityByIdParams {
	id: schema.Opportunity["id"];
}

export async function getOpportunityById(params: GetOpportunityByIdParams) {
	const { id } = params;

	const item = await db.query.opportunities.findFirst({
		where: {
			id,
		},
		with: {
			entityVersion: {
				columns: {},
				with: {
					entity: {
						columns: {
							slug: true,
						},
					},
				},
			},
		},
	});

	if (item == null) {
		return null;
	}

	const { entityVersion, ...rest } = item;
	const data = { ...rest, entity: entityVersion.entity };

	return data;
}

export type OpportunitiesWithEntities = Awaited<ReturnType<typeof getOpportunities>>;
export type OpportunityWithEntities = Awaited<ReturnType<typeof getOpportunityById>>;
