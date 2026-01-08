/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/dariah-knowledge-base-database-client";
import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { client } from "@dariah-eric/dariah-knowledge-base-image-service/client";

import { imageAssetWidth } from "@/config/assets.config";

interface GetImpactCaseStudiesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getImpactCaseStudies(params: GetImpactCaseStudiesParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.impactCaseStudies.findMany({
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
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id)),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const image = client.urls.generate(item.image.key, { width: imageAssetWidth.preview });

		return { ...item, image };
	});

	return { data, limit, offset, total };
}

interface GetImpactCaseStudyByIdParams {
	id: schema.ImpactCaseStudy["id"];
}

export async function getImpactCaseStudyById(params: GetImpactCaseStudyByIdParams) {
	const { id } = params;

	const item = await db.query.impactCaseStudies.findFirst({
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

	const image = client.urls.generate(item.image.key, { width: imageAssetWidth.featured });

	const data = { ...item, image };

	return data;
}

export type ImpactCaseStudiesWithEntities = Awaited<ReturnType<typeof getImpactCaseStudies>>;
export type ImpactCaseStudyWithEntities = Awaited<ReturnType<typeof getImpactCaseStudyById>>;
