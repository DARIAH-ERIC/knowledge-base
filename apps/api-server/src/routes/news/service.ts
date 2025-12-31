/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/dariah-knowledge-base-database-client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";

import type { Database } from "@/middlewares/db";

interface GetNewsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getNews(db: Database, params: GetNewsParams) {
	const { limit = 10, offset = 0 } = params;

	const [data, rows] = await Promise.all([
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
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
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

	const total = rows.at(0)?.total ?? 0;

	return { data, limit, offset, total };
}

//

interface GetNewsItemByIdParams {
	id: schema.NewsItem["id"];
}

export async function getNewsItemById(db: Database, params: GetNewsItemByIdParams) {
	const { id } = params;

	const data = await db.query.news.findFirst({
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

	if (data == null) {
		return null;
	}

	return data;
}

//

interface GetNewsItemBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getNewsItemBySlug(db: Database, params: GetNewsItemBySlugParams) {
	const { slug } = params;

	const data = await db.query.news.findFirst({
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

	if (data == null) {
		return null;
	}

	return data;
}
