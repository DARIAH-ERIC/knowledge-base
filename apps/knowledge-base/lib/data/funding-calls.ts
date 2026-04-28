/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, desc, eq, ilike } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

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
				? schema.entities.updatedAt
				: desc(schema.entities.updatedAt);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				duration: schema.fundingCalls.duration,
				id: schema.fundingCalls.id,
				slug: schema.entities.slug,
				summary: schema.fundingCalls.summary,
				title: schema.fundingCalls.title,
				updatedAt: schema.entities.updatedAt,
			})
			.from(schema.fundingCalls)
			.innerJoin(schema.entities, eq(schema.fundingCalls.id, schema.entities.id))
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.fundingCalls)
			.innerJoin(schema.entities, eq(schema.fundingCalls.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
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

interface CreateFundingCallParams extends schema.FundingCallInput {
	slug: schema.EntityInput["slug"];
}

export async function createFundingCall(params: CreateFundingCallParams) {
	const { duration, slug, summary, title } = params;

	const entityType = await db.query.entityTypes.findFirst({
		columns: {
			id: true,
		},
		where: { type: "funding_calls" },
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

		const fundingCall = {
			id,
			title,
			summary,
			duration,
		};

		await tx.insert(schema.fundingCalls).values(fundingCall);

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

export type FundingCallsWithEntities = Awaited<ReturnType<typeof getFundingCalls>>;
export type FundingCallWithEntities = Awaited<ReturnType<typeof getFundingCallById>>;
