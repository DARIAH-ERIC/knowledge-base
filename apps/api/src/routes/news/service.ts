/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@/services/db/sql";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import { getRelatedEntities, getRelatedResources } from "@/lib/relations";
import type { Database, Transaction } from "@/middlewares/db";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

interface GetNewsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getNews(db: Database | Transaction, params: GetNewsParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.news.findMany({
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			columns: {
				id: true,
				title: true,
				summary: true,
			},
			with: {
				entity: {
					columns: {
						slug: true,
						updatedAt: true,
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
			},
			orderBy(t, { desc, sql }) {
				return [desc(sql`"entity"."r" ->> 'updatedAt'`)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.news)
			.innerJoin(schema.entities, eq(schema.news.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const image = images.generateSignedImageUrl({
			key: item.image.key,
			options: { width: imageWidth.preview },
		});

		return { ...item, image, publishedAt: item.entity.updatedAt.toISOString() };
	});

	return { data, limit, offset, total };
}

//

interface GetNewsItemByIdParams {
	id: schema.NewsItem["id"];
}

export async function getNewsItemById(db: Database | Transaction, params: GetNewsItemByIdParams) {
	const { id } = params;

	const [item, fields] = await Promise.all([
		db.query.news.findFirst({
			where: {
				id,
				entity: {
					status: {
						type: "published",
					},
				},
			},
			columns: {
				id: true,
				title: true,
				summary: true,
			},
			with: {
				entity: {
					columns: {
						slug: true,
						updatedAt: true,
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
			},
		}),
		getContentBlocks(db, id),
	]);

	if (item == null) {
		return null;
	}

	const [relatedEntities, relatedResources] = await Promise.all([
		getRelatedEntities(db, id),
		getRelatedResources(db, id),
	]);

	const image = images.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageWidth.featured },
	});

	return {
		...item,
		image,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
		relatedEntities,
		relatedResources,
	};
}

//

interface GetNewsItemSlugsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getNewsItemSlugs(db: Database | Transaction, params: GetNewsItemSlugsParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.news.findMany({
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			columns: {
				id: true,
			},
			with: {
				entity: {
					columns: {
						slug: true,
						updatedAt: true,
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
			},
			orderBy(t, { desc, sql }) {
				return [desc(sql`"entity"."r" ->> 'updatedAt'`)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.news)
			.innerJoin(schema.entities, eq(schema.news.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items;

	return { data, limit, offset, total };
}

//

interface GetNewsItemBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getNewsItemBySlug(
	db: Database | Transaction,
	params: GetNewsItemBySlugParams,
) {
	const { slug } = params;

	const item = await db.query.news.findFirst({
		where: {
			entity: {
				slug,
				status: {
					type: "published",
				},
			},
		},
		columns: {
			id: true,
			title: true,
			summary: true,
		},
		with: {
			entity: {
				columns: {
					slug: true,
					updatedAt: true,
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
		options: { width: imageWidth.featured },
	});

	const [fields, relatedEntities, relatedResources] = await Promise.all([
		getContentBlocks(db, item.id),
		getRelatedEntities(db, item.id),
		getRelatedResources(db, item.id),
	]);

	return {
		...item,
		image,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
		relatedEntities,
		relatedResources,
	};
}
