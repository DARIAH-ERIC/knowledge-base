/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { imageAssetWidth } from "@/config/assets.config";
import { hasUnpublishedDraftChanges } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { and, count, desc, eq, ilike, or, sql } from "@/lib/db/sql";
import { images } from "@/lib/images";

export type SpotlightArticlesSort = "title" | "updatedAt";

interface GetSpotlightArticlesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	q?: string;
	sort?: SpotlightArticlesSort;
	dir?: "asc" | "desc";
}

export async function getSpotlightArticles(params: GetSpotlightArticlesParams) {
	const { limit = 10, offset = 0, q, sort = "updatedAt", dir = "desc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.spotlightArticles.title, `%${query}%`) : undefined;
	const orderBy =
		sort === "title"
			? dir === "asc"
				? schema.spotlightArticles.title
				: desc(schema.spotlightArticles.title)
			: dir === "asc"
				? schema.entityVersions.updatedAt
				: desc(schema.entityVersions.updatedAt);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				id: schema.spotlightArticles.id,
				documentId: schema.entities.id,
				slug: schema.entities.slug,
				summary: schema.spotlightArticles.summary,
				title: schema.spotlightArticles.title,
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
				publishedUpdatedAt: sql<Date | null>`
					(
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
				`,
				status: schema.entityStatus.type,
				updatedAt: schema.entityVersions.updatedAt,
			})
			.from(schema.spotlightArticles)
			.innerJoin(schema.entityVersions, eq(schema.spotlightArticles.id, schema.entityVersions.id))
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
			.from(schema.spotlightArticles)
			.innerJoin(schema.entityVersions, eq(schema.spotlightArticles.id, schema.entityVersions.id))
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
			id: item.id,
			documentId: item.documentId,
			entity: { slug: item.slug },
			hasDraft: hasUnpublishedDraftChanges(item),
			summary: item.summary,
			title: item.title,
			isPublished: item.isPublished,
			status: item.status,
			updatedAt: item.updatedAt,
		};
	});

	return { data, limit, offset, total };
}

interface GetSpotlightArticleByIdParams {
	id: schema.SpotlightArticle["id"];
}

export async function getSpotlightArticleById(params: GetSpotlightArticleByIdParams) {
	const { id } = params;

	const item = await db.query.spotlightArticles.findFirst({
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
			image: {
				columns: {
					key: true,
				},
			},
		},
	});

	if (item == null) {
		return null;
	}

	const image = images.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageAssetWidth.featured },
	});

	const { entityVersion, ...rest } = item;
	const data = { ...rest, entity: entityVersion.entity, image };

	return data;
}

export type SpotlightArticlesWithEntities = Awaited<ReturnType<typeof getSpotlightArticles>>;
export type SpotlightArticleWithEntities = Awaited<ReturnType<typeof getSpotlightArticleById>>;
