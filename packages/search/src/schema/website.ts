import { env } from "../../config/env.config";
import { createCollection } from "../create-collection";

export const website = createCollection({
	name: env.NEXT_PUBLIC_TYPESENSE_WEBSITE_COLLECTION_NAME,
	fields: [
		{ name: "type", type: "string" },
		{ name: "label", type: "string" },
		{ name: "description", type: "string" },
		{ name: "publication_date", type: "int64", optional: true },
		/**
		 * For resources: upstream URL, not the URL in the ingest source.
		 * For entities: relative paths.
		 */
		{ name: "url", type: "string", optional: true },
	],
	queryableFields: ["label", "description"],
	facetableFields: ["type"],
	sortableFields: ["publication_date"],
});

export type WebsiteCollectionField = (typeof website)["fields"][number];
export type WebsiteCollectionQueryField = (typeof website)["queryableFields"][number];
export type WebsiteCollectionFacetField = (typeof website)["facetableFields"][number];
export type WebsiteCollectionSortField = (typeof website)["sortableFields"][number];

export const websiteResourceTypes = [
	"publication",
	"tool-or-service",
	"training-material",
	"workflow",
] as const;

export type WebsiteResourceType = (typeof websiteResourceTypes)[number];

export const websiteEntityTypes = [
	"country",
	"document-or-policy",
	"event",
	"impact-case-study",
	"institution",
	"national-consortium",
	"news-item",
	"page",
	"person",
	"project",
	"spotlight-article",
	"working-group",
] as const;

export type WebsiteEntityType = (typeof websiteEntityTypes)[number];

export const websiteTypes = [...websiteResourceTypes, ...websiteEntityTypes] as const;

export type WebsiteType = (typeof websiteTypes)[number];

export function isWebsiteResourceType(type: WebsiteType): type is WebsiteResourceType {
	return websiteResourceTypes.includes(type as WebsiteResourceType);
}

export function isWebsiteEntityType(type: WebsiteType): type is WebsiteEntityType {
	return websiteEntityTypes.includes(type as WebsiteEntityType);
}

interface WebsiteCollectionDocumentBase {
	id: string;
	label: string;
	description: string;
	/** Only populated for news. */
	publication_date?: number | null;
	url: string | null;
}

export interface WebsiteResourceDocument extends WebsiteCollectionDocumentBase {
	type: WebsiteResourceType;
}

export interface WebsiteEntityDocument extends WebsiteCollectionDocumentBase {
	type: WebsiteEntityType;
}

export type WebsiteCollectionDocument = WebsiteResourceDocument | WebsiteEntityDocument;
