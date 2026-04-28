// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { eq, sql } from "@dariah-eric/database/sql";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import * as schema from "@dariah-eric/database/schema";

import type { Database, Transaction } from "@/middlewares/db";
import { search } from "@/services/search";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getRelatedEntities(db: Database | Transaction, entityId: string) {
	return db
		.select({
			id: schema.entities.id,
			slug: schema.entities.slug,
			entityType: schema.entityTypes.type,
			label: sql<string>`
				COALESCE(
					${schema.news.title},
					${schema.events.title},
					${schema.pages.title},
					${schema.impactCaseStudies.title},
					${schema.spotlightArticles.title},
					${schema.documentsPolicies.title},
					${schema.externalLinks.title},
					${schema.persons.name},
					${schema.organisationalUnits.name},
					${schema.projects.name}
				)
			`.as("label"),
		})
		.from(schema.entitiesToEntities)
		.innerJoin(schema.entities, eq(schema.entitiesToEntities.relatedEntityId, schema.entities.id))
		.innerJoin(schema.entityTypes, eq(schema.entities.typeId, schema.entityTypes.id))
		.leftJoin(schema.news, eq(schema.entities.id, schema.news.id))
		.leftJoin(schema.events, eq(schema.entities.id, schema.events.id))
		.leftJoin(schema.pages, eq(schema.entities.id, schema.pages.id))
		.leftJoin(schema.impactCaseStudies, eq(schema.entities.id, schema.impactCaseStudies.id))
		.leftJoin(schema.spotlightArticles, eq(schema.entities.id, schema.spotlightArticles.id))
		.leftJoin(schema.documentsPolicies, eq(schema.entities.id, schema.documentsPolicies.id))
		.leftJoin(schema.externalLinks, eq(schema.entities.id, schema.externalLinks.id))
		.leftJoin(schema.persons, eq(schema.entities.id, schema.persons.id))
		.leftJoin(schema.organisationalUnits, eq(schema.entities.id, schema.organisationalUnits.id))
		.leftJoin(schema.projects, eq(schema.entities.id, schema.projects.id))
		.where(eq(schema.entitiesToEntities.entityId, entityId));
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getRelatedResources(db: Database | Transaction, entityId: string) {
	const rows = await db
		.select({ resourceId: schema.entitiesToResources.resourceId })
		.from(schema.entitiesToResources)
		.where(eq(schema.entitiesToResources.entityId, entityId));

	if (rows.length === 0) {
		return [];
	}

	const ids = rows.map((r) => {
		return r.resourceId;
	});

	const result = await search.collections.resources.search({
		query: "*",
		queryBy: ["label"],
		filterBy: `id:[${ids.join(",")}]`,
		perPage: ids.length,
	});

	if (result.isErr()) {
		throw result.error;
	}

	return result.value.items.map((hit) => {
		return {
			id: hit.document.id,
			label: hit.document.label,
			type: hit.document.type,
			links: hit.document.links,
		};
	});
}
