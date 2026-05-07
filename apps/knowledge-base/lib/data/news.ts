/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { imageAssetWidth } from "@/config/assets.config";
import { db } from "@/lib/db";
import { count, desc, eq, ilike } from "@/lib/db/sql";
import { images } from "@/lib/images/";

export type NewsSort = "title" | "updatedAt";

interface GetNewsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	q?: string;
	sort?: NewsSort;
	dir?: "asc" | "desc";
}

export async function getNews(params: GetNewsParams) {
	const { limit = 10, offset = 0, q, sort = "updatedAt", dir = "desc" } = params;
	const query = q?.trim();
	const where = query != null && query !== "" ? ilike(schema.news.title, `%${query}%`) : undefined;
	const orderBy =
		sort === "title"
			? dir === "asc"
				? schema.news.title
				: desc(schema.news.title)
			: dir === "asc"
				? schema.entityVersions.updatedAt
				: desc(schema.entityVersions.updatedAt);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				id: schema.news.id,
				slug: schema.entities.slug,
				summary: schema.news.summary,
				title: schema.news.title,
				updatedAt: schema.entityVersions.updatedAt,
			})
			.from(schema.news)
			.innerJoin(schema.entityVersions, eq(schema.news.id, schema.entityVersions.id))
			.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.news)
			.innerJoin(schema.entityVersions, eq(schema.news.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(where),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		return {
			id: item.id,
			entity: { slug: item.slug },
			summary: item.summary,
			title: item.title,
			updatedAt: item.updatedAt,
		};
	});

	return { data, limit, offset, total };
}

interface GetNewsItemByIdParams {
	id: schema.NewsItem["id"];
}

export async function getNewsItemById(params: GetNewsItemByIdParams) {
	const { id } = params;

	const item = await db.query.news.findFirst({
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

export type NewsWithEntities = Awaited<ReturnType<typeof getNews>>;
export type NewsItemWithEntities = Awaited<ReturnType<typeof getNewsItemById>>;
