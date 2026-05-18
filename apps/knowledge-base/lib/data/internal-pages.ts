/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { currentEntityVersionWhere } from "@/lib/data/current-entity-version";
import { db } from "@/lib/db";
import { and, count, desc, eq, ilike } from "@/lib/db/sql";

export type InternalPagesSort = "title" | "updatedAt";

interface GetInternalPagesParams {
	limit?: number;
	offset?: number;
	q?: string;
	sort?: InternalPagesSort;
	dir?: "asc" | "desc";
}

export async function getInternalPages(params: GetInternalPagesParams) {
	const { limit = 10, offset = 0, q, sort = "updatedAt", dir = "desc" } = params;
	const query = q?.trim();
	const searchWhere =
		query != null && query !== "" ? ilike(schema.internalPages.title, `%${query}%`) : undefined;
	const where = and(currentEntityVersionWhere(), searchWhere);
	const orderBy =
		sort === "title"
			? dir === "asc"
				? schema.internalPages.title
				: desc(schema.internalPages.title)
			: dir === "asc"
				? schema.entityVersions.updatedAt
				: desc(schema.entityVersions.updatedAt);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				id: schema.internalPages.id,
				slug: schema.entities.slug,
				title: schema.internalPages.title,
				updatedAt: schema.entityVersions.updatedAt,
			})
			.from(schema.internalPages)
			.innerJoin(schema.entityVersions, eq(schema.internalPages.id, schema.entityVersions.id))
			.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.internalPages)
			.innerJoin(schema.entityVersions, eq(schema.internalPages.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
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
