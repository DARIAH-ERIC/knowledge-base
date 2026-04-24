/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, desc, eq, ilike } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

import { imageAssetWidth } from "@/config/assets.config";
import { images } from "@/lib/images";

interface GetImpactCaseStudiesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	q?: string;
}

export async function getImpactCaseStudies(params: GetImpactCaseStudiesParams) {
	const { limit = 10, offset = 0, q } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.impactCaseStudies.title, `%${query}%`) : undefined;

	const [items, aggregate] = await Promise.all([
		db
			.select({
				id: schema.impactCaseStudies.id,
				slug: schema.entities.slug,
				summary: schema.impactCaseStudies.summary,
				title: schema.impactCaseStudies.title,
			})
			.from(schema.impactCaseStudies)
			.innerJoin(schema.entities, eq(schema.impactCaseStudies.id, schema.entities.id))
			.where(where)
			.orderBy(desc(schema.entities.updatedAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.impactCaseStudies)
			.innerJoin(schema.entities, eq(schema.impactCaseStudies.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(where),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		return {
			id: item.id,
			entity: { slug: item.slug },
			summary: item.summary,
			title: item.title,
		};
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

	const image = images.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageAssetWidth.featured },
	});

	const data = { ...item, image };

	return data;
}

interface CreateImpactCaseStudyParams extends schema.ImpactCaseStudyInput {
	slug: schema.EntityInput["slug"];
}

export async function createImpactCaseStudy(params: CreateImpactCaseStudyParams) {
	const { imageId, slug, summary, title } = params;

	const entityType = await db.query.entityTypes.findFirst({
		columns: {
			id: true,
		},
		where: { type: "impact_case_studies" },
	});

	if (entityType == null) {
		return;
	}

	const entityStatus = await db.query.entityStatus.findFirst({
		columns: {
			id: true,
		},
		where: { type: "draft" },
	});

	if (entityStatus == null) {
		return;
	}

	const entityId = await db.transaction(async (tx) => {
		const [item] = await tx
			.insert(schema.entities)
			.values({
				typeId: entityType.id,
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

		const impactCaseStudy = {
			id,
			title,
			summary,
			imageId,
			location,
		};

		await tx.insert(schema.impactCaseStudies).values(impactCaseStudy);

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

export type ImpactCaseStudiesWithEntities = Awaited<ReturnType<typeof getImpactCaseStudies>>;
export type ImpactCaseStudyWithEntities = Awaited<ReturnType<typeof getImpactCaseStudyById>>;
