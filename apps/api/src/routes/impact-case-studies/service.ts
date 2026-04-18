/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import { getRelatedEntities, getRelatedResources } from "@/lib/relations";
import type { Database, Transaction } from "@/middlewares/db";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

interface GetImpactCaseStudiesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getImpactCaseStudies(
	db: Database | Transaction,
	params: GetImpactCaseStudiesParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.impactCaseStudies.findMany({
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
			.from(schema.impactCaseStudies)
			.innerJoin(schema.entities, eq(schema.impactCaseStudies.id, schema.entities.id))
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

interface GetImpactCaseStudyByIdParams {
	id: schema.ImpactCaseStudy["id"];
}

export async function getImpactCaseStudyById(
	db: Database | Transaction,
	params: GetImpactCaseStudyByIdParams,
) {
	const { id } = params;

	const [item, fields] = await Promise.all([
		db.query.impactCaseStudies.findFirst({
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
				contributors: {
					columns: {
						id: true,
						name: true,
					},
					with: {
						image: {
							columns: {
								key: true,
							},
						},
					},
				},
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
	]);

	if (item == null) {
		return null;
	}

	const [relatedEntities, relatedResources] = await Promise.all([
		getRelatedEntities(db, id),
		getRelatedResources(db, id),
	]);

	const contributors = item.contributors.map((contributor) => {
		const image = images.generateSignedImageUrl({
			key: contributor.image.key,
			options: { width: imageWidth.avatar },
		});

		return { ...contributor, image };
	});

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

interface GetImpactCaseStudySlugsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getImpactCaseStudySlugs(
	db: Database | Transaction,
	params: GetImpactCaseStudySlugsParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.impactCaseStudies.findMany({
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
			.from(schema.impactCaseStudies)
			.innerJoin(schema.entities, eq(schema.impactCaseStudies.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items;

	return { data, limit, offset, total };
}

//

interface GetImpactCaseStudyBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getImpactCaseStudyBySlug(
	db: Database | Transaction,
	params: GetImpactCaseStudyBySlugParams,
) {
	const { slug } = params;

	const item = await db.query.impactCaseStudies.findFirst({
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
			contributors: {
				columns: {
					id: true,
					name: true,
				},
				with: {
					image: {
						columns: {
							key: true,
						},
					},
				},
			},
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

	const contributors = item.contributors.map((contributor) => {
		const image = images.generateSignedImageUrl({
			key: contributor.image.key,
			options: { width: imageWidth.avatar },
		});

		return { ...contributor, image };
	});

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
