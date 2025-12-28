/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

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

	const [data, total] = await Promise.all([
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
		db.$count(schema.impactCaseStudies),
	]);

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
