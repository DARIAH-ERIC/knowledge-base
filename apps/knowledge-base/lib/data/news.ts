/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/dariah-knowledge-base-database-client";
import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { client } from "@dariah-eric/dariah-knowledge-base-image-service/client";

import { imageAssetWidth } from "@/config/assets.config";

interface GetNewsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getNews(params: GetNewsParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.news.findMany({
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
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id)),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const image = client.urls.generate(item.image.key, { width: imageAssetWidth.preview });

		return { ...item, image };
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

	const image = client.urls.generate(item.image.key, { width: imageAssetWidth.featured });

	const data = { ...item, image };

	return data;
}

export type NewsWithEntities = Awaited<ReturnType<typeof getNews>>;
export type NewsItemWithEntities = Awaited<ReturnType<typeof getNewsItemById>>;
