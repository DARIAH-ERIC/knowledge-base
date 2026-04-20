/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

export async function getAvailablePersons() {
	const persons = await db
		.select({ id: schema.persons.id, name: schema.persons.name })
		.from(schema.persons)
		.orderBy(schema.persons.sortName);

	return persons;
}

export type AvailablePerson = Awaited<ReturnType<typeof getAvailablePersons>>[number];

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
