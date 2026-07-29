/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { relationOptionsPageSize } from "@/lib/constants/relations";
import { db } from "@/lib/db";
import { matchesAllTerms } from "@/lib/db/search";
import { desc, eq, inArray, sql } from "@/lib/db/sql";

export interface AnnouncementOption extends Record<string, unknown> {
	id: string;
	name: string;
}

interface GetAnnouncementOptionsParams {
	limit?: number;
	offset?: number;
	q?: string;
}

export async function getAnnouncementOptions(
	params: GetAnnouncementOptionsParams = {},
): Promise<{ items: Array<AnnouncementOption>; total: number }> {
	const { limit = relationOptionsPageSize, offset = 0, q } = params;
	const query = q?.trim();
	const newsWhere = matchesAllTerms(query, schema.news.title);
	const opportunitiesWhere = matchesAllTerms(query, schema.opportunities.title);
	const fundingCallsWhere = matchesAllTerms(query, schema.fundingCalls.title);

	const branches = [
		sql`
			SELECT ${schema.news.id} AS id, ${schema.news.title} AS name, ${schema.news.publicationDate} AS published_at
			FROM ${schema.news}
			INNER JOIN ${schema.entityVersions} ON ${schema.news.id} = ${schema.entityVersions.id}
			INNER JOIN ${schema.documentLifecycle} ON ${schema.documentLifecycle.publishedId} = ${schema.entityVersions.id}
			${newsWhere == null ? sql`` : sql`WHERE ${newsWhere}`}
		`,
		sql`
			SELECT ${schema.opportunities.id} AS id, ${schema.opportunities.title} AS name, LOWER(${schema.opportunities.duration}) AS published_at
			FROM ${schema.opportunities}
			INNER JOIN ${schema.entityVersions} ON ${schema.opportunities.id} = ${schema.entityVersions.id}
			INNER JOIN ${schema.documentLifecycle} ON ${schema.documentLifecycle.publishedId} = ${schema.entityVersions.id}
			${opportunitiesWhere == null ? sql`` : sql`WHERE ${opportunitiesWhere}`}
		`,
		sql`
			SELECT ${schema.fundingCalls.id} AS id, ${schema.fundingCalls.title} AS name, LOWER(${schema.fundingCalls.duration}) AS published_at
			FROM ${schema.fundingCalls}
			INNER JOIN ${schema.entityVersions} ON ${schema.fundingCalls.id} = ${schema.entityVersions.id}
			INNER JOIN ${schema.documentLifecycle} ON ${schema.documentLifecycle.publishedId} = ${schema.entityVersions.id}
			${fundingCallsWhere == null ? sql`` : sql`WHERE ${fundingCallsWhere}`}
		`,
	];

	const [itemsResult, aggregateResult] = await Promise.all([
		db.execute<AnnouncementOption>(sql`
			SELECT id, name
			FROM (${sql.join(branches, sql` UNION ALL `)}) AS announcements
			ORDER BY published_at DESC, id DESC
			LIMIT ${limit} OFFSET ${offset}
		`),
		db.execute<{ total: number }>(sql`
			SELECT COUNT(*)::int AS total
			FROM (${sql.join(branches, sql` UNION ALL `)}) AS announcements
		`),
	]);

	return {
		items: itemsResult.rows,
		total: aggregateResult.rows.at(0)?.total ?? 0,
	};
}

export async function getAnnouncementOptionsByIds(ids: ReadonlyArray<string>) {
	if (ids.length === 0) {
		return [];
	}

	const [news, opportunities, fundingCalls] = await Promise.all([
		db
			.select({ id: schema.news.id, name: schema.news.title })
			.from(schema.news)
			.innerJoin(schema.entityVersions, eq(schema.news.id, schema.entityVersions.id))
			.innerJoin(
				schema.documentLifecycle,
				eq(schema.documentLifecycle.publishedId, schema.entityVersions.id),
			)
			.where(inArray(schema.news.id, [...ids]))
			.orderBy(desc(schema.news.publicationDate), schema.news.id),
		db
			.select({ id: schema.opportunities.id, name: schema.opportunities.title })
			.from(schema.opportunities)
			.innerJoin(schema.entityVersions, eq(schema.opportunities.id, schema.entityVersions.id))
			.innerJoin(
				schema.documentLifecycle,
				eq(schema.documentLifecycle.publishedId, schema.entityVersions.id),
			)
			.where(inArray(schema.opportunities.id, [...ids]))
			.orderBy(desc(sql<Date>`LOWER(${schema.opportunities.duration})`), schema.opportunities.id),
		db
			.select({ id: schema.fundingCalls.id, name: schema.fundingCalls.title })
			.from(schema.fundingCalls)
			.innerJoin(schema.entityVersions, eq(schema.fundingCalls.id, schema.entityVersions.id))
			.innerJoin(
				schema.documentLifecycle,
				eq(schema.documentLifecycle.publishedId, schema.entityVersions.id),
			)
			.where(inArray(schema.fundingCalls.id, [...ids]))
			.orderBy(desc(sql<Date>`LOWER(${schema.fundingCalls.duration})`), schema.fundingCalls.id),
	]);

	const itemById = new Map(
		[...news, ...opportunities, ...fundingCalls].map((row) => [row.id, row] as const),
	);

	return ids.flatMap((id) => {
		const item = itemById.get(id);
		return item != null ? [item] : [];
	});
}
