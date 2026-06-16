import * as schema from "@dariah-eric/database/schema";
import type { ResourceItem, SearchResourcesParams } from "@dariah-eric/search";

import { db } from "@/lib/db";
import { and, eq, sql } from "@/lib/db/sql";
import { search } from "@/lib/search";

/**
 * Slugs of the national consortia related to `countryDocumentId` and active in the campaign `year`.
 * Unit↔unit relations and the report's country are document-level; the consortium owner is resolved
 * through its document and guarded by org-unit type. Used to filter the SSH Open Marketplace /
 * Zotero search by `national_consortia`.
 */
export async function getCountryConsortiumSlugs(
	countryDocumentId: string,
	year: number,
): Promise<Array<string>> {
	const rows = await db
		.select({ slug: schema.entities.slug })
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.innerJoin(
			schema.entities,
			eq(schema.entities.id, schema.organisationalUnitsRelations.unitDocumentId),
		)
		.innerJoin(
			schema.documentLifecycle,
			eq(schema.documentLifecycle.documentId, schema.entities.id),
		)
		.innerJoin(
			schema.organisationalUnits,
			sql`${schema.organisationalUnits.id} = COALESCE(${schema.documentLifecycle.publishedId}, ${schema.documentLifecycle.draftId})`,
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.where(
			and(
				eq(schema.organisationalUnitsRelations.relatedUnitDocumentId, countryDocumentId),
				eq(schema.organisationalUnitStatus.status, "is_national_consortium_of"),
				eq(
					schema.organisationalUnitTypes.type,
					"national_consortium" as typeof schema.organisationalUnitTypes.$inferSelect.type,
				),
				sql`
					${schema.organisationalUnitsRelations.duration} && tstzrange (
						MAKE_DATE(${year}, 1, 1)::TIMESTAMPTZ,
						MAKE_DATE(${year + 1}, 1, 1)::TIMESTAMPTZ
					)
				`,
			),
		);

	return Array.from(new Set(rows.map((row) => row.slug)));
}

/**
 * Fetches every page of a resources search and returns the flattened items. Returns `[]` if the
 * first page errors; individual later-page errors are skipped.
 */
export async function searchAllResourcePages(
	params: SearchResourcesParams,
): Promise<Array<ResourceItem>> {
	const firstResult = await search.collections.resources.search({ ...params, page: 1 });
	if (!firstResult.isOk()) {
		return [];
	}

	const remainingResults = await Promise.all(
		Array.from({ length: Math.max(firstResult.value.pagination.totalPages - 1, 0) }, (_, index) =>
			search.collections.resources.search({ ...params, page: index + 2 }),
		),
	);

	return [
		...firstResult.value.items,
		...remainingResults.flatMap((result) => (result.isOk() ? result.value.items : [])),
	];
}

/** Builds the `national_consortia:=[...]` filter fragment from consortium slugs. */
export function nationalConsortiaFilter(slugs: ReadonlyArray<string>): string {
	return `national_consortia:=[${slugs.map((slug) => `\`${slug}\``).join(",")}]`;
}
