/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { and, count, desc, eq, ilike, or, sql } from "@/lib/db/sql";

export type FundingCallsSort = "title" | "updatedAt";

interface GetFundingCallsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	q?: string;
	sort?: FundingCallsSort;
	dir?: "asc" | "desc";
}

export async function getFundingCalls(params: GetFundingCallsParams) {
	const { limit = 10, offset = 0, q, sort = "updatedAt", dir = "desc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.fundingCalls.title, `%${query}%`) : undefined;
	const orderBy =
		sort === "title"
			? dir === "asc"
				? schema.fundingCalls.title
				: desc(schema.fundingCalls.title)
			: dir === "asc"
				? schema.entityVersions.updatedAt
				: desc(schema.entityVersions.updatedAt);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				documentId: schema.entities.id,
				duration: schema.fundingCalls.duration,
				id: schema.fundingCalls.id,
				slug: schema.entities.slug,
				summary: schema.fundingCalls.summary,
				title: schema.fundingCalls.title,
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
				status: schema.entityStatus.type,
				updatedAt: schema.entityVersions.updatedAt,
			})
			.from(schema.fundingCalls)
			.innerJoin(schema.entityVersions, eq(schema.fundingCalls.id, schema.entityVersions.id))
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
			.from(schema.fundingCalls)
			.innerJoin(schema.entityVersions, eq(schema.fundingCalls.id, schema.entityVersions.id))
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
			entity: { slug: item.slug },
			summary: item.summary,
			title: item.title,
			isPublished: item.isPublished,
			status: item.status,
			updatedAt: item.updatedAt,
		};
	});

	return { data, limit, offset, total };
}

interface GetFundingCallByIdParams {
	id: schema.FundingCall["id"];
}

export async function getFundingCallById(params: GetFundingCallByIdParams) {
	const { id } = params;

	const item = await db.query.fundingCalls.findFirst({
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

export type FundingCallsWithEntities = Awaited<ReturnType<typeof getFundingCalls>>;
export type FundingCallWithEntities = Awaited<ReturnType<typeof getFundingCallById>>;
