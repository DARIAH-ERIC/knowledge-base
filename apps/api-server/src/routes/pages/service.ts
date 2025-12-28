/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";

interface GetPagesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getPages(params: GetPagesParams) {
	const { limit = 10, offset = 0 } = params;

	const [data, total] = await Promise.all([
		db.query.pages.findMany({
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
		db.$count(schema.pages),
	]);

	return { data, limit, offset, total };
}

//

interface GetPageByIdParams {
	id: schema.Page["id"];
}

export async function getPageById(params: GetPageByIdParams) {
	const { id } = params;

	const data = await db.query.pages.findFirst({
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

interface GetPageBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getPageBySlug(params: GetPageBySlugParams) {
	const { slug } = params;

	const data = await db.query.pages.findFirst({
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
