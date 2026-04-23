/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { and, count, eq } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import { getRelatedEntities, getRelatedResources } from "@/lib/relations";
import type { Database, Transaction } from "@/middlewares/db";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

interface GetSpotlightArticlesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getSpotlightArticles(
	db: Database | Transaction,
	params: GetSpotlightArticlesParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
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
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const image = images.generateSignedImageUrl({
			key: item.image.key,
			options: { width: imageWidth.preview },
		});

		return { ...item, image, publishedAt: item.entity.updatedAt.toISOString() };
	});

	return { data, limit, offset, total };
}

//

interface GetSpotlightArticleByIdParams {
	id: schema.SpotlightArticle["id"];
}

async function getContributors(db: Database | Transaction, spotlightArticleId: string) {
	const rows = await db
		.select({
			id: schema.persons.id,
			name: schema.persons.name,
			position: schema.persons.position,
			slug: schema.entities.slug,
			imageKey: schema.assets.key,
			role: schema.spotlightArticlesToPersons.role,
		})
		.from(schema.spotlightArticlesToPersons)
		.innerJoin(schema.persons, eq(schema.spotlightArticlesToPersons.personId, schema.persons.id))
		.innerJoin(schema.entities, eq(schema.persons.id, schema.entities.id))
		.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
		.innerJoin(schema.assets, eq(schema.persons.imageId, schema.assets.id))
		.where(
			and(
				eq(schema.spotlightArticlesToPersons.spotlightArticleId, spotlightArticleId),
				eq(schema.entityStatus.type, "published"),
			),
		);

	return rows.map(({ imageKey, ...row }) => {
		return {
			...row,
			image: images.generateSignedImageUrl({
				key: imageKey,
				options: { width: imageWidth.avatar },
			}),
		};
	});
}

//

export async function getSpotlightArticleById(
	db: Database | Transaction,
	params: GetSpotlightArticleByIdParams,
) {
	const { id } = params;

	const [item, fields, contributors] = await Promise.all([
		db.query.spotlightArticles.findFirst({
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
						updatedAt: true,
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
			},
		}),
		getContentBlocks(db, id),
		getContributors(db, id),
	]);

	if (item == null) {
		return null;
	}

	const [relatedEntities, relatedResources] = await Promise.all([
		getRelatedEntities(db, id),
		getRelatedResources(db, id),
	]);

	const image = images.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageWidth.featured },
	});

	return {
		...item,
		contributors,
		image,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
		relatedEntities,
		relatedResources,
	};
}

//

interface GetSpotlightArticleSlugsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getSpotlightArticleSlugs(
	db: Database | Transaction,
	params: GetSpotlightArticleSlugsParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
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
			},
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
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items;

	return { data, limit, offset, total };
}

//

interface GetSpotlightArticleBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getSpotlightArticleBySlug(
	db: Database | Transaction,
	params: GetSpotlightArticleBySlugParams,
) {
	const { slug } = params;

	const item = await db.query.spotlightArticles.findFirst({
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
					updatedAt: true,
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

	const contributors = await getContributors(db, item.id);

	const image = images.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageWidth.featured },
	});

	const [fields, relatedEntities, relatedResources] = await Promise.all([
		getContentBlocks(db, item.id),
		getRelatedEntities(db, item.id),
		getRelatedResources(db, item.id),
	]);

	return {
		...item,
		contributors,
		image,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
		relatedEntities,
		relatedResources,
	};
}
