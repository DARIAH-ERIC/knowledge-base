/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { relationOptionsPageSize } from "@/lib/constants/relations";
import { publishedEntityVersionWhere } from "@/lib/data/current-entity-version";
import { db } from "@/lib/db";
import { matchesAllTerms } from "@/lib/db/search";
import { alias, and, count, eq, inArray, sql } from "@/lib/db/sql";

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
	const searchWhere = matchesAllTerms(query, schema.persons.name);
	const where = and(publishedEntityVersionWhere(), searchWhere);

	const [items, aggregate] = await Promise.all([
		db
			.select({ id: schema.persons.id, name: schema.persons.name })
			.from(schema.persons)
			.innerJoin(schema.entityVersions, eq(schema.persons.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(where)
			.orderBy(schema.persons.sortName)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.persons)
			.innerJoin(schema.entityVersions, eq(schema.persons.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(where),
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
		.innerJoin(schema.entityVersions, eq(schema.persons.id, schema.entityVersions.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.where(and(publishedEntityVersionWhere(), inArray(schema.persons.id, [...ids])))
		.orderBy(schema.persons.sortName);

	const itemById = new Map(rows.map((row) => [row.id, row] as const));

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

/**
 * `documentId` is the impact case study's `entities.id`. Contributors are document-level; each
 * person endpoint (also a document id) is resolved to its latest editable version for its name.
 */
export async function getImpactCaseStudyContributors(documentId: string) {
	return db
		.select({
			personId: schema.impactCaseStudiesToPersons.personDocumentId,
			personName: schema.persons.name,
			role: schema.impactCaseStudiesToPersons.role,
		})
		.from(schema.impactCaseStudiesToPersons)
		.innerJoin(
			schema.documentLifecycle,
			eq(schema.documentLifecycle.documentId, schema.impactCaseStudiesToPersons.personDocumentId),
		)
		.innerJoin(
			schema.persons,
			sql`${schema.persons.id} = COALESCE(${schema.documentLifecycle.publishedId}, ${schema.documentLifecycle.draftId})`,
		)
		.where(eq(schema.impactCaseStudiesToPersons.impactCaseStudyDocumentId, documentId));
}

export type ImpactCaseStudyContributor = Awaited<
	ReturnType<typeof getImpactCaseStudyContributors>
>[number];

/**
 * `documentId` is the spotlight article's `entities.id`. Contributors are document-level; each
 * person endpoint (also a document id) is resolved to its latest editable version for its name.
 */
export async function getSpotlightArticleContributors(documentId: string) {
	return db
		.select({
			personId: schema.spotlightArticlesToPersons.personDocumentId,
			personName: schema.persons.name,
			role: schema.spotlightArticlesToPersons.role,
		})
		.from(schema.spotlightArticlesToPersons)
		.innerJoin(
			schema.documentLifecycle,
			eq(schema.documentLifecycle.documentId, schema.spotlightArticlesToPersons.personDocumentId),
		)
		.innerJoin(
			schema.persons,
			sql`${schema.persons.id} = COALESCE(${schema.documentLifecycle.publishedId}, ${schema.documentLifecycle.draftId})`,
		)
		.where(eq(schema.spotlightArticlesToPersons.spotlightArticleDocumentId, documentId));
}

export type SpotlightArticleContributor = Awaited<
	ReturnType<typeof getSpotlightArticleContributors>
>[number];

export interface PersonArticle {
	/** The article's `entities.id`, not the id of a particular version. */
	documentId: string;
	slug: string;
	title: string;
	publicationDate: Date;
	entityType: "impact_case_studies" | "spotlight_articles";
	role: schema.ArticleContributorRole;
}

/**
 * The reverse lens: every article a person is credited on, newest first. `personDocumentId` is the
 * person's `entities.id`. Each article is resolved to its latest editable version, so an editor
 * sees drafts here too — unlike the public api, which resolves published versions only.
 *
 * Read-only on the person side: the edge is owned by the article, and is created and deleted from
 * the spotlight-article and impact-case-study edit screens.
 */
export async function getPersonArticles(personDocumentId: string): Promise<Array<PersonArticle>> {
	const spotlightArticleDocumentLifecycle = alias(
		schema.documentLifecycle,
		"spotlight_article_document_lifecycle",
	);
	const impactCaseStudyDocumentLifecycle = alias(
		schema.documentLifecycle,
		"impact_case_study_document_lifecycle",
	);
	const spotlightArticleEntities = alias(schema.entities, "spotlight_article_entities");
	const impactCaseStudyEntities = alias(schema.entities, "impact_case_study_entities");

	const [spotlightArticles, impactCaseStudies] = await Promise.all([
		db
			.select({
				documentId: spotlightArticleEntities.id,
				slug: spotlightArticleEntities.slug,
				title: schema.spotlightArticles.title,
				publicationDate: schema.spotlightArticles.publicationDate,
				role: schema.spotlightArticlesToPersons.role,
			})
			.from(schema.spotlightArticlesToPersons)
			.innerJoin(
				spotlightArticleEntities,
				eq(
					spotlightArticleEntities.id,
					schema.spotlightArticlesToPersons.spotlightArticleDocumentId,
				),
			)
			.innerJoin(
				spotlightArticleDocumentLifecycle,
				eq(spotlightArticleDocumentLifecycle.documentId, spotlightArticleEntities.id),
			)
			.innerJoin(
				schema.spotlightArticles,
				sql`${schema.spotlightArticles.id} = COALESCE(${spotlightArticleDocumentLifecycle.draftId}, ${spotlightArticleDocumentLifecycle.publishedId})`,
			)
			.where(eq(schema.spotlightArticlesToPersons.personDocumentId, personDocumentId)),
		db
			.select({
				documentId: impactCaseStudyEntities.id,
				slug: impactCaseStudyEntities.slug,
				title: schema.impactCaseStudies.title,
				publicationDate: schema.impactCaseStudies.publicationDate,
				role: schema.impactCaseStudiesToPersons.role,
			})
			.from(schema.impactCaseStudiesToPersons)
			.innerJoin(
				impactCaseStudyEntities,
				eq(impactCaseStudyEntities.id, schema.impactCaseStudiesToPersons.impactCaseStudyDocumentId),
			)
			.innerJoin(
				impactCaseStudyDocumentLifecycle,
				eq(impactCaseStudyDocumentLifecycle.documentId, impactCaseStudyEntities.id),
			)
			.innerJoin(
				schema.impactCaseStudies,
				sql`${schema.impactCaseStudies.id} = COALESCE(${impactCaseStudyDocumentLifecycle.draftId}, ${impactCaseStudyDocumentLifecycle.publishedId})`,
			)
			.where(eq(schema.impactCaseStudiesToPersons.personDocumentId, personDocumentId)),
	]);

	const articles = [
		...spotlightArticles.map((row) => {
			return { ...row, entityType: "spotlight_articles" as const };
		}),
		...impactCaseStudies.map((row) => {
			return { ...row, entityType: "impact_case_studies" as const };
		}),
	];

	return articles.toSorted((a, b) => {
		const byDate = b.publicationDate.getTime() - a.publicationDate.getTime();
		return byDate !== 0 ? byDate : a.title.localeCompare(b.title);
	});
}
