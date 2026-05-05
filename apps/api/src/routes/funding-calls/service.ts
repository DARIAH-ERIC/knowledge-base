/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@/services/db/sql";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import { getRelatedEntities, getRelatedResources } from "@/lib/relations";
import type { Database, Transaction } from "@/middlewares/db";

interface GetFundingCallsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getFundingCalls(db: Database | Transaction, params: GetFundingCallsParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.fundingCalls.findMany({
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
				duration: true,
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
			.from(schema.fundingCalls)
			.innerJoin(schema.entities, eq(schema.fundingCalls.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
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

interface GetFundingCallByIdParams {
	id: schema.FundingCall["id"];
}

export async function getFundingCallById(
	db: Database | Transaction,
	params: GetFundingCallByIdParams,
) {
	const { id } = params;

	const [item, fields] = await Promise.all([
		db.query.fundingCalls.findFirst({
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
				duration: true,
			},
			with: {
				entity: {
					columns: {
						slug: true,
						updatedAt: true,
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

interface GetFundingCallSlugsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getFundingCallSlugs(
	db: Database | Transaction,
	params: GetFundingCallSlugsParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.fundingCalls.findMany({
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
			.from(schema.fundingCalls)
			.innerJoin(schema.entities, eq(schema.fundingCalls.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items;

	return { data, limit, offset, total };
}

//

interface GetFundingCallBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getFundingCallBySlug(
	db: Database | Transaction,
	params: GetFundingCallBySlugParams,
) {
	const { slug } = params;

	const item = await db.query.fundingCalls.findFirst({
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
			duration: true,
		},
		with: {
			entity: {
				columns: {
					slug: true,
					updatedAt: true,
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
