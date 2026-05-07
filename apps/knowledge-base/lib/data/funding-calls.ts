/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { count, desc, eq, ilike } from "@/lib/db/sql";

export type FundingCallsSort = "title" | "updatedAt";

interface GetFundingCallsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	q?: string;
	sort?: FundingCallsSort;
	dir?: "asc" | "desc";
}

export async function getFundingCalls(params: GetFundingCallsParams) {
	const { limit = 10, offset = 0, q, sort = "updatedAt", dir = "desc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.fundingCalls.title, `%${query}%`) : undefined;
	const orderBy =
		sort === "title"
			? dir === "asc"
				? schema.fundingCalls.title
				: desc(schema.fundingCalls.title)
			: dir === "asc"
				? schema.entityVersions.updatedAt
				: desc(schema.entityVersions.updatedAt);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				duration: schema.fundingCalls.duration,
				id: schema.fundingCalls.id,
				slug: schema.entities.slug,
				summary: schema.fundingCalls.summary,
				title: schema.fundingCalls.title,
				updatedAt: schema.entityVersions.updatedAt,
			})
			.from(schema.fundingCalls)
			.innerJoin(schema.entityVersions, eq(schema.fundingCalls.id, schema.entityVersions.id))
			.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.fundingCalls)
			.innerJoin(schema.entityVersions, eq(schema.fundingCalls.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(where),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		return {
			duration: item.duration,
			id: item.id,
			entity: { slug: item.slug },
			summary: item.summary,
			title: item.title,
			updatedAt: item.updatedAt,
		};
	});

	return { data, limit, offset, total };
}

interface GetFundingCallByIdParams {
	id: schema.FundingCall["id"];
}

export async function getFundingCallById(params: GetFundingCallByIdParams) {
	const { id } = params;

	const item = await db.query.fundingCalls.findFirst({
		where: {
			id,
		},
		with: {
			entityVersion: {
				columns: {},
				with: {
					entity: {
						columns: {
							slug: true,
						},
					},
				},
			},
		},
	});

	if (item == null) {
		return null;
	}

	const { entityVersion, ...rest } = item;
	const data = { ...rest, entity: entityVersion.entity };

	return data;
}

export type FundingCallsWithEntities = Awaited<ReturnType<typeof getFundingCalls>>;
export type FundingCallWithEntities = Awaited<ReturnType<typeof getFundingCallById>>;
