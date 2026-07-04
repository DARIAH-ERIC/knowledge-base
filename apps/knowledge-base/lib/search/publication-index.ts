import {
	createWebsiteResourceDocument,
	loadKnowledgeBasePublicationDocuments,
} from "@dariah-eric/search-resources";

import { db } from "@/lib/db";
import { search } from "@/lib/search/admin";

/** Idempotently update or remove one database-owned publication in both Typesense projections. */
export async function syncPublicationSearchDocument(publicationId: string): Promise<void> {
	const documents = await loadKnowledgeBasePublicationDocuments(db);
	const document = documents.find((item) => item.source_id === publicationId);
	const documentId = `knowledge-base:${publicationId}`;

	if (document == null) {
		// A draft/archived/deleted publication must not remain publicly searchable. A missing document
		// is harmless; full resource rebuilds remain the repair path if Typesense is unavailable here.
		await Promise.all([
			search.collections.resources.delete(documentId),
			search.collections.website.delete(documentId),
		]);
		return;
	}

	const [resourceResult, websiteResult] = await Promise.all([
		search.collections.resources.ingest([document]),
		search.collections.website.ingest([createWebsiteResourceDocument(document)]),
	]);
	resourceResult.unwrap();
	websiteResult.unwrap();
}
