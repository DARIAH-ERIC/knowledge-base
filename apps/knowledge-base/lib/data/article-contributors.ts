/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq, ilike, inArray } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";

import { relationOptionsPageSize } from "@/lib/constants/relations";

export interface PersonOption {
	id: string;
	name: string;
}

interface GetPersonOptionsParams {
	limit?: number;
	offset?: number;
	q?: string;
}

export async function getPersonOptions(
	params: GetPersonOptionsParams = {},
): Promise<{ items: Array<PersonOption>; total: number }> {
	const { limit = relationOptionsPageSize, offset = 0, q } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.persons.name, `%${query}%`) : undefined;

	const [items, aggregate] = await Promise.all([
		db
			.select({ id: schema.persons.id, name: schema.persons.name })
			.from(schema.persons)
			.where(where)
			.orderBy(schema.persons.sortName)
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(schema.persons).where(where),
	]);

	return { items, total: aggregate.at(0)?.total ?? 0 };
}

export async function getPersonOptionsByIds(ids: ReadonlyArray<string>) {
	if (ids.length === 0) {
		return [];
	}

	const rows = await db
		.select({ id: schema.persons.id, name: schema.persons.name })
		.from(schema.persons)
		.where(inArray(schema.persons.id, [...ids]))
		.orderBy(schema.persons.sortName);

	const itemById = new Map(
		rows.map((row) => {
			return [row.id, row] as const;
		}),
	);

	return ids.flatMap((id) => {
		const item = itemById.get(id);
		return item != null ? [item] : [];
	});
}

export async function getAvailablePersons() {
	const { items } = await getPersonOptions({ limit: 250 });
	return items;
}

export type AvailablePerson = PersonOption;

export async function getImpactCaseStudyContributors(articleId: string) {
	return db
		.select({
			personId: schema.impactCaseStudiesToPersons.personId,
			personName: schema.persons.name,
			role: schema.impactCaseStudiesToPersons.role,
		})
		.from(schema.impactCaseStudiesToPersons)
		.innerJoin(schema.persons, eq(schema.persons.id, schema.impactCaseStudiesToPersons.personId))
		.where(eq(schema.impactCaseStudiesToPersons.impactCaseStudyId, articleId));
}

export type ImpactCaseStudyContributor = Awaited<
	ReturnType<typeof getImpactCaseStudyContributors>
>[number];

export async function getSpotlightArticleContributors(articleId: string) {
	return db
		.select({
			personId: schema.spotlightArticlesToPersons.personId,
			personName: schema.persons.name,
			role: schema.spotlightArticlesToPersons.role,
		})
		.from(schema.spotlightArticlesToPersons)
		.innerJoin(schema.persons, eq(schema.persons.id, schema.spotlightArticlesToPersons.personId))
		.where(eq(schema.spotlightArticlesToPersons.spotlightArticleId, articleId));
}

export type SpotlightArticleContributor = Awaited<
	ReturnType<typeof getSpotlightArticleContributors>
>[number];
