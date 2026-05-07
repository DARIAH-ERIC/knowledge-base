/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
	and,
	count,
	desc,
	eq,
	inArray,
	or,
	sql,
	type SQL,
	type SQLWrapper,
} from "@/services/db/sql";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import { getRelatedEntities, getRelatedResources } from "@/lib/relations";
import type { Database, Transaction } from "@/middlewares/db";
import type { OpportunitySource, OpportunityStatus } from "@/routes/opportunities/schemas";

interface GetOpportunitiesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	status?: OpportunityStatus | Array<OpportunityStatus>;
	source?: OpportunitySource | Array<OpportunitySource>;
}

function buildStatusFilter(duration: SQLWrapper, statuses: Array<OpportunityStatus>): SQL {
	const lower = sql`LOWER(${duration})`;
	const upper = sql`UPPER(${duration})`;

	return or(
		...statuses.map((status) => {
			switch (status) {
				case "upcoming": {
					return sql`${lower} > NOW()::TIMESTAMPTZ`;
				}
				case "open": {
					return sql`${duration} @> NOW()::TIMESTAMPTZ`;
				}
				case "closed": {
					return sql`${upper} <= NOW()::TIMESTAMPTZ`;
				}
			}
		}),
	)!;
}

export async function getOpportunities(db: Database | Transaction, params: GetOpportunitiesParams) {
	const { limit = 10, offset = 0, source, status } = params;
	const statuses = status == null ? [] : Array.isArray(status) ? status : [status];
	const sources = source == null ? [] : Array.isArray(source) ? source : [source];
	const aggregateStatusFilter =
		statuses.length > 0 ? buildStatusFilter(schema.opportunities.duration, statuses) : undefined;
	const aggregateSourceFilter =
		sources.length > 0 ? inArray(schema.opportunitySources.source, sources) : undefined;

	const [items, aggregate] = await Promise.all([
		db.query.opportunities.findMany({
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
				RAW:
					statuses.length > 0
						? (t) => {
								return buildStatusFilter(t.duration, statuses);
							}
						: undefined,
				source:
					sources.length > 0
						? {
								source: {
									in: sources,
								},
							}
						: undefined,
			},
			columns: {
				id: true,
				title: true,
				summary: true,
				website: true,
				duration: true,
			},
			with: {
				entity: {
					columns: {
						slug: true,
						updatedAt: true,
					},
				},
				source: {
					columns: {
						id: true,
						source: true,
					},
				},
			},
			orderBy(t) {
				return [desc(sql`LOWER(${t.duration})`), desc(t.id)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.opportunities)
			.innerJoin(schema.entities, eq(schema.opportunities.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.innerJoin(
				schema.opportunitySources,
				eq(schema.opportunities.sourceId, schema.opportunitySources.id),
			)
			.where(
				and(
					eq(schema.entityStatus.type, "published"),
					aggregateStatusFilter,
					aggregateSourceFilter,
				),
			),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const duration = {
			start: item.duration.start.toISOString(),
			end: item.duration.end?.toISOString(),
		};

		return {
			...item,
			duration,
			publishedAt: item.entity.updatedAt.toISOString(),
		};
	});

	return { data, limit, offset, total };
}

//

interface GetOpportunityByIdParams {
	id: schema.Opportunity["id"];
}

export async function getOpportunityById(
	db: Database | Transaction,
	params: GetOpportunityByIdParams,
) {
	const { id } = params;

	const [item, fields] = await Promise.all([
		db.query.opportunities.findFirst({
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
				website: true,
				duration: true,
			},
			with: {
				entity: {
					columns: {
						slug: true,
						updatedAt: true,
					},
				},
				source: {
					columns: {
						id: true,
						source: true,
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

	const duration = {
		start: item.duration.start.toISOString(),
		end: item.duration.end?.toISOString(),
	};

	return {
		...item,
		duration,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
		relatedEntities,
		relatedResources,
	};
}

//

interface GetOpportunitySlugsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getOpportunitySlugs(
	db: Database | Transaction,
	params: GetOpportunitySlugsParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.opportunities.findMany({
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
			},
			orderBy(t, { desc, sql }) {
				return [desc(sql`"entity"."r" ->> 'updatedAt'`)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.opportunities)
			.innerJoin(schema.entities, eq(schema.opportunities.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items;

	return { data, limit, offset, total };
}

//

interface GetOpportunityBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getOpportunityBySlug(
	db: Database | Transaction,
	params: GetOpportunityBySlugParams,
) {
	const { slug } = params;

	const item = await db.query.opportunities.findFirst({
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
			website: true,
			duration: true,
		},
		with: {
			entity: {
				columns: {
					slug: true,
					updatedAt: true,
				},
			},
			source: {
				columns: {
					id: true,
					source: true,
				},
			},
		},
	});

	if (item == null) {
		return null;
	}

	const [fields, relatedEntities, relatedResources] = await Promise.all([
		getContentBlocks(db, item.id),
		getRelatedEntities(db, item.id),
		getRelatedResources(db, item.id),
	]);

	const duration = {
		start: item.duration.start.toISOString(),
		end: item.duration.end?.toISOString(),
	};

	return {
		...item,
		duration,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
		relatedEntities,
		relatedResources,
	};
}
