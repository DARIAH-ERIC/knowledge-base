/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, desc, eq, ilike } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

import { imageAssetWidth } from "@/config/assets.config";
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
				? schema.entities.updatedAt
				: desc(schema.entities.updatedAt);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				id: schema.news.id,
				slug: schema.entities.slug,
				summary: schema.news.summary,
				title: schema.news.title,
				updatedAt: schema.entities.updatedAt,
			})
			.from(schema.news)
			.innerJoin(schema.entities, eq(schema.news.id, schema.entities.id))
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.news)
			.innerJoin(schema.entities, eq(schema.news.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
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
			entity: {
				columns: {
					slug: true,
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

	const data = { ...item, image };

	return data;
}

interface CreateNewsItemParams extends schema.NewsItemInput {
	slug: schema.EntityInput["slug"];
}

export async function createNewsItem(params: CreateNewsItemParams) {
	const { imageId, slug, summary, title } = params;

	const entityType = await db.query.entityTypes.findFirst({
		columns: {
			id: true,
		},
		where: { type: "news" },
	});

	if (entityType == null) {
		return null;
	}

	const entityStatus = await db.query.entityStatus.findFirst({
		columns: {
			id: true,
		},
		where: { type: "draft" },
	});

	if (entityStatus == null) {
		return null;
	}

	const entityId = await db.transaction(async (tx) => {
		const [item] = await tx
			.insert(schema.entities)
			.values({
				typeId: entityType.id,
				documentId: undefined,
				statusId: entityStatus.id,
				slug,
			})
			.returning({
				id: schema.entities.id,
			});

		if (item == null) {
			return tx.rollback();
		}

		const { id } = item;

		const newsItem = {
			id,
			title,
			summary,
			imageId,
		};

		await tx.insert(schema.news).values(newsItem);

		const fieldNamesIds = await tx.query.entityTypesFieldsNames.findMany({
			where: {
				entityTypeId: entityType.id,
			},
		});

		const fields = fieldNamesIds.map(({ id: fieldNameId }) => {
			return { entityId: id, fieldNameId };
		});

		await tx.insert(schema.fields).values(fields).returning({
			id: schema.fields.id,
		});

		return id;
	});

	return {
		entityId,
	};
}

export type NewsWithEntities = Awaited<ReturnType<typeof getNews>>;
export type NewsItemWithEntities = Awaited<ReturnType<typeof getNewsItemById>>;
