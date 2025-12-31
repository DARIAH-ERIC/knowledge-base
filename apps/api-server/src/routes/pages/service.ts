/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/dariah-knowledge-base-database-client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";

import type { Database } from "@/middlewares/db";

interface GetPagesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getPages(db: Database, params: GetPagesParams) {
	const { limit = 10, offset = 0 } = params;

	const [data, rows] = await Promise.all([
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
			.from(schema.pages)
			.innerJoin(schema.entities, eq(schema.pages.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = rows.at(0)?.total ?? 0;

	return { data, limit, offset, total };
}

//

interface GetPageByIdParams {
	id: schema.Page["id"];
}

export async function getPageById(db: Database, params: GetPageByIdParams) {
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

export async function getPageBySlug(db: Database, params: GetPageBySlugParams) {
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
