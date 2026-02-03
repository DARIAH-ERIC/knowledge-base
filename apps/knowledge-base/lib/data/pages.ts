/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { client } from "@dariah-eric/images/client";

import { imageAssetWidth } from "@/config/assets.config";

interface GetPagesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getPages(params: GetPagesParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.pages.findMany({
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
			.from(schema.pages)
			.innerJoin(schema.entities, eq(schema.pages.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id)),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const image = item.image
			? client.urls.generateSignedImageUrl({
					key: item.image.key,
					options: { width: imageAssetWidth.preview },
				})
			: null;

		return { ...item, image };
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

	const image = item.image
		? client.urls.generateSignedImageUrl({
				key: item.image.key,
				options: { width: imageAssetWidth.featured },
			})
		: null;

	const data = { ...item, image };

	return data;
}

interface CreatePageParams extends Omit<schema.PageInput, "id" | "createdAt" | "updatedAt"> {
	slug: string;
	resourceIds?: Array<string>;
}

export async function createPage(params: CreatePageParams) {
	const { imageId, slug, summary, title } = params;

	const entityType = await db.query.entityTypes.findFirst({
		columns: {
			id: true,
		},
		where: { type: "pages" },
	});

	if (entityType == null) {
		return null;
	}

	const entityStatus = await db.query.entityStatus.findFirst({
		columns: {
			id: true,
		},
		where: { type: "draft" },
	});

	if (entityStatus == null) {
		return null;
	}

	const entityId = await db.transaction(async (tx) => {
		const [item] = await tx
			.insert(schema.entities)
			.values({
				typeId: entityType.id,
				documentId: undefined,
				statusId: entityStatus.id,
				slug,
			})
			.returning({
				id: schema.entities.id,
			});

		if (item == null) {
			return tx.rollback();
		}

		const { id } = item;

		const page = {
			id,
			title,
			summary,
			imageId,
		};

		await tx.insert(schema.pages).values(page);

		const fieldNamesIds = await tx.query.entityTypesFieldsNames.findMany({
			where: {
				entityTypeId: entityType.id,
			},
		});

		const fields = fieldNamesIds.map(({ id: fieldNameId }) => {
			return { entityId: id, fieldNameId };
		});

		await tx.insert(schema.fields).values(fields).returning({
			id: schema.fields.id,
		});

		return id;
	});

	return {
		entityId,
	};
}

export type PagesWithEntities = Awaited<ReturnType<typeof getPages>>;
export type PageWithEntities = Awaited<ReturnType<typeof getPageById>>;
