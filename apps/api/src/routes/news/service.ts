/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { client } from "@dariah-eric/images/client";

import type { Database, Transaction } from "@/middlewares/db";
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
		const image = client.urls.generateSignedImageUrl({
			key: item.image.key,
			options: { width: imageWidth.preview },
		});

		return { ...item, image };
	});

	return { data, limit, offset, total };
}

//

interface GetNewsItemByIdParams {
	id: schema.NewsItem["id"];
}

export async function getNewsItemById(db: Database | Transaction, params: GetNewsItemByIdParams) {
	const { id } = params;

	const item = await db.query.news.findFirst({
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

	const image = client.urls.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageWidth.featured },
	});

	const data = { ...item, image };

	return data;
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

	const image = client.urls.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageWidth.featured },
	});

	const data = { ...item, image };

	return data;
}
