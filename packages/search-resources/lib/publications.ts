import type { Database } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { eq } from "@dariah-eric/database/sql";
import type { PublicationResourceDocument } from "@dariah-eric/search";

function creatorName(creator: schema.PublicationCreator): string | null {
	const name = creator.literal ?? [creator.given, creator.family].filter(Boolean).join(" ");
	return name.trim() === "" ? null : name.trim();
}

/** Load the canonical published bibliography and derive search facets from explicit relations. */
export async function loadKnowledgeBasePublicationDocuments(
	db: Database,
): Promise<Array<PublicationResourceDocument>> {
	const rows = await db
		.select({
			publication: schema.publications,
			unitSlug: schema.entities.slug,
			unitType: schema.organisationalUnitTypes.type,
		})
		.from(schema.publications)
		.leftJoin(
			schema.publicationsToOrganisationalUnits,
			eq(schema.publicationsToOrganisationalUnits.publicationId, schema.publications.id),
		)
		.leftJoin(
			schema.entities,
			eq(schema.entities.id, schema.publicationsToOrganisationalUnits.organisationalUnitDocumentId),
		)
		.leftJoin(schema.documentLifecycle, eq(schema.documentLifecycle.documentId, schema.entities.id))
		.leftJoin(
			schema.organisationalUnits,
			eq(schema.organisationalUnits.id, schema.documentLifecycle.publishedId),
		)
		.leftJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.where(eq(schema.publications.status, "published"));

	const documents = new Map<string, PublicationResourceDocument>();
	for (const row of rows) {
		const publication = row.publication;
		let document = documents.get(publication.id);
		if (document == null) {
			document = {
				id: `knowledge-base:${publication.id}`,
				source: "knowledge-base",
				source_id: publication.id,
				source_updated_at: publication.updatedAt.getTime(),
				imported_at: publication.createdAt.getTime(),
				type: "publication",
				label: publication.title,
				description: publication.abstract ?? "",
				keywords: publication.keywords,
				kind: publication.type,
				source_url: null,
				links: publication.url == null ? [] : [publication.url],
				authors: publication.creators.flatMap((creator) => {
					const name = creatorName(creator);
					return name == null ? [] : [name];
				}),
				year: publication.publicationYear,
				pid: publication.doi,
				national_consortia: [],
				working_groups: [],
				institutions: [],
				upstream_sources: publication.zoteroKey == null ? null : ["zotero"],
			};
			documents.set(publication.id, document);
		}
		if (row.unitSlug != null && row.unitType === "national_consortium") {
			document.national_consortia.push(row.unitSlug);
		} else if (row.unitSlug != null && row.unitType === "working_group") {
			document.working_groups.push(row.unitSlug);
		}
	}

	return [...documents.values()];
}
