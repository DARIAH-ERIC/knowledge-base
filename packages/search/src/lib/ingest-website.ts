import { createWebsiteDocumentId, website, type WebsiteCollectionDocument } from "../schema";
import { contentBlocksToPlaintext, type ContentBlockLike } from "./content-blocks-to-plaintext";
import type { Client } from "./admin-client";

export interface WebsiteSourceDocument {
	type: WebsiteCollectionDocument["type"];
	identifier: string;
	label: string;
	description?: string | null;
	contentBlocks?: Array<ContentBlockLike> | null;
	publication_date?: number | null;
	slug?: string | null;
	country_slug?: string | null;
	url?: string | null;
}

function getDescription(source: WebsiteSourceDocument): string {
	const description = source.description?.trim();

	if (description != null && description.length > 0) {
		return description;
	}

	if (source.contentBlocks == null) {
		return "";
	}

	return contentBlocksToPlaintext(source.contentBlocks);
}

export function mapWebsiteDocument(source: WebsiteSourceDocument): WebsiteCollectionDocument {
	return {
		id: createWebsiteDocumentId(source.type, source.identifier),
		type: source.type,
		label: source.label,
		description: getDescription(source),
		publication_date: source.publication_date ?? null,
		slug: source.slug,
		country_slug: source.country_slug ?? undefined,
		url: source.url,
	};
}

export function mapWebsiteDocuments(
	sources: Array<WebsiteSourceDocument>,
): Array<WebsiteCollectionDocument> {
	return sources.map(mapWebsiteDocument);
}

export async function ingestWebsite(client: Client): Promise<void> {
	// TODO: fetch resource records from the source of truth.
	const resourceSources: Array<WebsiteSourceDocument> = [];

	// TODO: fetch entity records from the source of truth and derive plaintext from content blocks.
	const entitySources: Array<WebsiteSourceDocument> = [];

	const documents = [
		...mapWebsiteDocuments(resourceSources),
		...mapWebsiteDocuments(entitySources),
	];

	if (documents.length === 0) {
		return;
	}

	await client.collections(website.name).documents().import(documents);
}
