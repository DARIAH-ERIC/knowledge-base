/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { client } from "@dariah-eric/images/client";

import type { Database, Transaction } from "@/middlewares/db";
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
		const image = client.urls.generateSignedImageUrl({
			key: item.image.key,
			options: { width: imageWidth.preview },
		});

		return { ...item, image };
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

	const item = await db.query.impactCaseStudies.findFirst({
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
		const image = client.urls.generateSignedImageUrl({
			key: contributor.image.key,
			options: { width: imageWidth.avatar },
		});

		return { ...contributor, image };
	});

	const image = client.urls.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageWidth.featured },
	});

	const data = { ...item, contributors, image };

	return data;
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
		const image = client.urls.generateSignedImageUrl({
			key: contributor.image.key,
			options: { width: imageWidth.avatar },
		});

		return { ...contributor, image };
	});

	const image = client.urls.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageWidth.featured },
	});

	const data = { ...item, contributors, image };

	return data;
}
