/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { imageAssetWidth } from "@/config/assets.config";
import { db } from "@/lib/db";
import { count, desc, eq, ilike } from "@/lib/db/sql";
import { images } from "@/lib/images";

export type PagesSort = "title" | "updatedAt";

interface GetPagesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	q?: string;
	sort?: PagesSort;
	dir?: "asc" | "desc";
}

export async function getPages(params: GetPagesParams) {
	const { limit = 10, offset = 0, q, sort = "updatedAt", dir = "desc" } = params;
	const query = q?.trim();
	const where = query != null && query !== "" ? ilike(schema.pages.title, `%${query}%`) : undefined;
	const orderBy =
		sort === "title"
			? dir === "asc"
				? schema.pages.title
				: desc(schema.pages.title)
			: dir === "asc"
				? schema.entityVersions.updatedAt
				: desc(schema.entityVersions.updatedAt);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				id: schema.pages.id,
				slug: schema.entities.slug,
				summary: schema.pages.summary,
				title: schema.pages.title,
				updatedAt: schema.entityVersions.updatedAt,
			})
			.from(schema.pages)
			.innerJoin(schema.entityVersions, eq(schema.pages.id, schema.entityVersions.id))
			.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.pages)
			.innerJoin(schema.entityVersions, eq(schema.pages.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
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

interface GetPageByIdParams {
	id: schema.Page["id"];
}

export async function getPageById(params: GetPageByIdParams) {
	const { id } = params;

	const item = await db.query.pages.findFirst({
		where: {
			id,
		},
		with: {
			entityVersion: {
				columns: {},
				with: {
					entity: {
						columns: {
							slug: true,
						},
					},
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

	const image = item.image
		? images.generateSignedImageUrl({
				key: item.image.key,
				options: { width: imageAssetWidth.featured },
			})
		: null;

	const { entityVersion, ...rest } = item;
	const data = { ...rest, entity: entityVersion.entity, image };

	return data;
}

export type PagesWithEntities = Awaited<ReturnType<typeof getPages>>;
export type PageWithEntities = Awaited<ReturnType<typeof getPageById>>;
