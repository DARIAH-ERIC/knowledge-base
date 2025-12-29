/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/dariah-knowledge-base-database-client";
import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";

interface GetImpactCaseStudiesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getImpactCaseStudies(params: GetImpactCaseStudiesParams) {
	const { limit = 10, offset = 0 } = params;

	const [data, rows] = await Promise.all([
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
					},
					orderBy: {
						updatedAt: "desc",
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
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

	const total = rows.at(0)?.total ?? 0;

	return { data, limit, offset, total };
}

//

interface GetImpactCaseStudyByIdParams {
	id: schema.ImpactCaseStudy["id"];
}

export async function getImpactCaseStudyById(params: GetImpactCaseStudyByIdParams) {
	const { id } = params;

	const data = await db.query.impactCaseStudies.findFirst({
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
					firstName: true,
					lastName: true,
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

	if (data == null) {
		return null;
	}

	return data;
}

//

interface GetImpactCaseStudyBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getImpactCaseStudyBySlug(params: GetImpactCaseStudyBySlugParams) {
	const { slug } = params;

	const data = await db.query.impactCaseStudies.findFirst({
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
					firstName: true,
					lastName: true,
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

	if (data == null) {
		return null;
	}

	return data;
}
