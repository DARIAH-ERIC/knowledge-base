/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import { flattenEntityVersion } from "@/lib/entity-version";
import { generateImageUrl } from "@/lib/images";
import { getPersonPositions } from "@/lib/persons";
import { getRelatedEntities, getRelatedResources } from "@/lib/relations";
import type { Database, Transaction } from "@/middlewares/db";
import { count, eq } from "@/services/db/sql";
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
				entityVersion: {
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
				entityVersion: {
					columns: { updatedAt: true },
					with: {
						entity: {
							columns: { slug: true },
						},
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
			},
			orderBy(t, { desc, sql }) {
				return [desc(sql`"entityVersion"."r" ->> 'updatedAt'`)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.spotlightArticles)
			.innerJoin(schema.entityVersions, eq(schema.spotlightArticles.id, schema.entityVersions.id))
			.innerJoin(
				schema.documentLifecycle,
				eq(schema.documentLifecycle.publishedId, schema.entityVersions.id),
			),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const image = generateImageUrl(item.image, imageWidth.preview);

		return { ...flattenEntityVersion(item), image };
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
			slug: schema.entities.slug,
			imageKey: schema.assets.key,
			role: schema.spotlightArticlesToPersons.role,
		})
		.from(schema.spotlightArticlesToPersons)
		.innerJoin(schema.persons, eq(schema.spotlightArticlesToPersons.personId, schema.persons.id))
		.innerJoin(schema.entityVersions, eq(schema.persons.id, schema.entityVersions.id))
		.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
		.innerJoin(
			schema.documentLifecycle,
			eq(schema.documentLifecycle.publishedId, schema.entityVersions.id),
		)
		.innerJoin(schema.assets, eq(schema.persons.imageId, schema.assets.id))
		.where(eq(schema.spotlightArticlesToPersons.spotlightArticleId, spotlightArticleId));

	const positions = await getPersonPositions(
		db,
		rows.map((row) => row.id),
	);

	return rows.map(({ imageKey, ...row }) => {
		return {
			...row,
			position: positions.get(row.id) ?? null,
			image: generateImageUrl({ key: imageKey }, imageWidth.avatar),
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
				entityVersion: {
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
				entityVersion: {
					columns: { updatedAt: true },
					with: {
						entity: {
							columns: { slug: true },
						},
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

	const image = generateImageUrl(item.image, imageWidth.featured);

	return {
		...flattenEntityVersion(item),
		contributors,
		image,
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
				entityVersion: {
					status: {
						type: "published",
					},
				},
			},
			columns: {
				id: true,
			},
			with: {
				entityVersion: {
					columns: { updatedAt: true },
					with: {
						entity: {
							columns: { slug: true },
						},
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
			},
			orderBy(t, { desc, sql }) {
				return [desc(sql`"entityVersion"."r" ->> 'updatedAt'`)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.spotlightArticles)
			.innerJoin(schema.entityVersions, eq(schema.spotlightArticles.id, schema.entityVersions.id))
			.innerJoin(
				schema.documentLifecycle,
				eq(schema.documentLifecycle.publishedId, schema.entityVersions.id),
			),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map(({ id, entityVersion }) => {
		return { id, entity: { slug: entityVersion.entity.slug } };
	});

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
			entityVersion: {
				status: {
					type: "published",
				},
				entity: {
					slug,
				},
			},
		},
		columns: {
			id: true,
			title: true,
			summary: true,
		},
		with: {
			entityVersion: {
				columns: { updatedAt: true },
				with: {
					entity: {
						columns: { slug: true },
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

	const contributors = await getContributors(db, item.id);

	const image = generateImageUrl(item.image, imageWidth.featured);

	const [fields, relatedEntities, relatedResources] = await Promise.all([
		getContentBlocks(db, item.id),
		getRelatedEntities(db, item.id),
		getRelatedResources(db, item.id),
	]);

	return {
		...flattenEntityVersion(item),
		contributors,
		image,
		...fields,
		relatedEntities,
		relatedResources,
	};
}
