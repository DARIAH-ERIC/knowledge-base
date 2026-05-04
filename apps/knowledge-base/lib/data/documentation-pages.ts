/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { count, desc, eq, ilike } from "@/lib/db/sql";

export type DocumentationPagesSort = "title" | "updatedAt";

interface GetDocumentationPagesParams {
	limit?: number;
	offset?: number;
	q?: string;
	sort?: DocumentationPagesSort;
	dir?: "asc" | "desc";
}

export async function getDocumentationPages(params: GetDocumentationPagesParams) {
	const { limit = 10, offset = 0, q, sort = "updatedAt", dir = "desc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== ""
			? ilike(schema.documentationPages.title, `%${query}%`)
			: undefined;
	const orderBy =
		sort === "title"
			? dir === "asc"
				? schema.documentationPages.title
				: desc(schema.documentationPages.title)
			: dir === "asc"
				? schema.entityVersions.updatedAt
				: desc(schema.entityVersions.updatedAt);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				id: schema.documentationPages.id,
				slug: schema.entities.slug,
				title: schema.documentationPages.title,
				updatedAt: schema.entityVersions.updatedAt,
			})
			.from(schema.documentationPages)
			.innerJoin(schema.entityVersions, eq(schema.documentationPages.id, schema.entityVersions.id))
			.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.documentationPages)
			.innerJoin(schema.entityVersions, eq(schema.documentationPages.id, schema.entityVersions.id))
			.where(where),
	]);

	return {
		data: items.map((item) => {
			return {
				id: item.id,
				entity: { slug: item.slug },
				title: item.title,
				updatedAt: item.updatedAt,
			};
		}),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}

interface GetDocumentationPageByIdParams {
	id: schema.DocumentationPage["id"];
}

export async function getDocumentationPageById(params: GetDocumentationPageByIdParams) {
	const { id } = params;

	const item = await db.query.documentationPages.findFirst({
		where: {
			id,
		},
		with: {
			entityVersion: {
				columns: { id: true },
				with: {
					entity: {
						columns: {
							id: true,
							slug: true,
						},
					},
				},
			},
		},
	});

	if (item == null) {
		return null;
	}

	const { entityVersion, ...rest } = item;
	return { ...rest, entity: entityVersion.entity };
}
