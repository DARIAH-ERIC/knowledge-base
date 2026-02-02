/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { client } from "@dariah-eric/images/client";

import { imageAssetWidth } from "@/config/assets.config";

interface GetSpotlightArticlesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getSpotlightArticles(params: GetSpotlightArticlesParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.spotlightArticles.findMany({
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
			.from(schema.spotlightArticles)
			.innerJoin(schema.entities, eq(schema.spotlightArticles.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id)),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const image = client.urls.generateSignedImageUrl({
			key: item.image.key,
			options: { width: imageAssetWidth.featured },
		});

		return { ...item, image };
	});

	return { data, limit, offset, total };
}

interface GetSpotlightArticleByIdParams {
	id: schema.SpotlightArticle["id"];
}

export async function getSpotlightArticleById(params: GetSpotlightArticleByIdParams) {
	const { id } = params;

	const item = await db.query.spotlightArticles.findFirst({
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

	const image = client.urls.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageAssetWidth.featured },
	});

	const data = { ...item, image };

	return data;
}

interface CreateSpotlightArticleParams extends Omit<
	schema.SpotlightArticleInput,
	"id" | "createdAt" | "updatedAt"
> {
	slug: string;
	resourceIds?: Array<string>;
}
export async function createSpotlightArticle(params: CreateSpotlightArticleParams) {
	const { imageId, slug, summary, title } = params;

	const entityType =
		(await db.query.entityTypes.findFirst({
			columns: {
				id: true,
			},
			where: { type: "spotlight_articles" },
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
		const entityIds = await tx
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

		if (!entityIds[0]) return tx.rollback();

		const { id } = entityIds[0];

		const spotlightArticle = {
			id,
			title,
			summary,
			imageId,
		};
		await tx.insert(schema.spotlightArticles).values(spotlightArticle);

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

	// decide, what we need to return here
	return {
		entityId,
	};
}

export type SpotlightArticlesWithEntities = Awaited<ReturnType<typeof getSpotlightArticles>>;
export type SpotlightArticleWithEntities = Awaited<ReturnType<typeof getSpotlightArticleById>>;
