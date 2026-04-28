/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, desc, eq, ilike } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

export type OpportunitiesSort = "title" | "source" | "updatedAt";

interface GetOpportunitiesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	q?: string;
	sort?: OpportunitiesSort;
	dir?: "asc" | "desc";
}

export async function getOpportunities(params: GetOpportunitiesParams) {
	const { limit = 10, offset = 0, q, sort = "updatedAt", dir = "desc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.opportunities.title, `%${query}%`) : undefined;
	const orderBy =
		sort === "title"
			? dir === "asc"
				? schema.opportunities.title
				: desc(schema.opportunities.title)
			: sort === "source"
				? dir === "asc"
					? schema.opportunitySources.source
					: desc(schema.opportunitySources.source)
				: dir === "asc"
					? schema.entities.updatedAt
					: desc(schema.entities.updatedAt);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				duration: schema.opportunities.duration,
				id: schema.opportunities.id,
				source: schema.opportunitySources.source,
				sourceId: schema.opportunities.sourceId,
				slug: schema.entities.slug,
				summary: schema.opportunities.summary,
				title: schema.opportunities.title,
				updatedAt: schema.entities.updatedAt,
				website: schema.opportunities.website,
			})
			.from(schema.opportunities)
			.innerJoin(schema.entities, eq(schema.opportunities.id, schema.entities.id))
			.innerJoin(
				schema.opportunitySources,
				eq(schema.opportunities.sourceId, schema.opportunitySources.id),
			)
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.opportunities)
			.innerJoin(schema.entities, eq(schema.opportunities.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(where),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		return {
			duration: item.duration,
			id: item.id,
			sourceId: item.sourceId,
			source: {
				id: item.sourceId,
				source: item.source,
			},
			entity: { slug: item.slug },
			summary: item.summary,
			title: item.title,
			updatedAt: item.updatedAt,
			website: item.website,
		};
	});

	return { data, limit, offset, total };
}

interface GetOpportunityByIdParams {
	id: schema.Opportunity["id"];
}

export async function getOpportunityById(params: GetOpportunityByIdParams) {
	const { id } = params;

	const item = await db.query.opportunities.findFirst({
		where: {
			id,
		},
		with: {
			entity: {
				columns: {
					slug: true,
				},
			},
		},
	});

	if (item == null) {
		return null;
	}

	const data = { ...item };

	return data;
}

interface CreateOpportunityParams extends schema.OpportunityInput {
	slug: schema.EntityInput["slug"];
}

export async function createOpportunity(params: CreateOpportunityParams) {
	const { duration, sourceId, slug, summary, title, website } = params;

	const entityType = await db.query.entityTypes.findFirst({
		columns: {
			id: true,
		},
		where: { type: "opportunities" },
	});

	if (entityType == null) {
		return null;
	}

	const entityStatus = await db.query.entityStatus.findFirst({
		columns: {
			id: true,
		},
		where: { type: "draft" },
	});

	if (entityStatus == null) {
		return null;
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

		const opportunity = {
			id,
			title,
			summary,
			sourceId,
			duration,
			website,
		};

		await tx.insert(schema.opportunities).values(opportunity);

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

export type OpportunitiesWithEntities = Awaited<ReturnType<typeof getOpportunities>>;
export type OpportunityWithEntities = Awaited<ReturnType<typeof getOpportunityById>>;
