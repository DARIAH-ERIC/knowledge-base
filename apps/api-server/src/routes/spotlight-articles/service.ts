/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";

interface GetSpotlightArticlesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getSpotlightArticles(params: GetSpotlightArticlesParams) {
	const { limit = 10, offset = 0 } = params;

	const [data, total] = await Promise.all([
		db.query.spotlightArticles.findMany({
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
					orderBy: {
						updatedAt: "desc",
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
		db.$count(schema.spotlightArticles),
	]);

	return { data, limit, offset, total };
}

//

interface GetSpotlightArticleByIdParams {
	id: schema.SpotlightArticle["id"];
}

export async function getSpotlightArticleById(params: GetSpotlightArticleByIdParams) {
	const { id } = params;

	const data = await db.query.spotlightArticles.findFirst({
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

interface GetSpotlightArticleBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getSpotlightArticleBySlug(params: GetSpotlightArticleBySlugParams) {
	const { slug } = params;

	const data = await db.query.spotlightArticles.findFirst({
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
