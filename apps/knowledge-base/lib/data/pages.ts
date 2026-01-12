/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/dariah-knowledge-base-database-client";
import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { client } from "@dariah-eric/dariah-knowledge-base-image-service/client";

import { imageAssetWidth } from "@/config/assets.config";
import { config as fieldsConfig } from "@/config/fields.config";
import { createEntities, createFields } from "@/lib/data/entities";

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
			? client.urls.generate(item.image.key, { width: imageAssetWidth.preview })
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
		? client.urls.generate(item.image.key, { width: imageAssetWidth.featured })
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

	const entityType =
		(await db.query.entityTypes.findFirst({
			columns: {
				id: true,
			},
			where: { type: "pages" },
		})) ?? undefined;

	if (!entityType) return;

	const entityStatus = await db.query.entityStatus.findFirst({
		columns: {
			id: true,
		},
		where: { type: "draft" },
	});

	if (!entityStatus) return;

	const entityId = await db.transaction(async (tx) => {
		const entityIds = await createEntities({
			ctx: tx,
			data: [
				{
					typeId: entityType.id,
					documentId: undefined,
					statusId: entityStatus.id,
					slug,
				},
			],
		});

		if (!entityIds[0]) return tx.rollback();

		const { id } = entityIds[0];

		const page = {
			id,
			title,
			summary,
			imageId,
		};
		await tx.insert(schema.pages).values(page);

		const fields = fieldsConfig.pages.map((fieldName) => {
			return { entityId: id, name: fieldName };
		});

		await createFields({ ctx: tx, data: fields });
		return id;
	});

	// decide, what we need to return here
	return {
		entityId,
	};
}

export type PagesWithEntities = Awaited<ReturnType<typeof getPages>>;
export type PageWithEntities = Awaited<ReturnType<typeof getPageById>>;
