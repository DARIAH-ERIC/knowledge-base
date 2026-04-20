import { createCollection } from "../create-collection";

export const website = createCollection({
	name: "website",
	fields: [
		{ name: "type", type: "string" },
		{ name: "label", type: "string" },
		{ name: "description", type: "string" },
		{ name: "publication_date", type: "int64", optional: true },
		/** Database entity slug for internal website pages. */
		{ name: "slug", type: "string", optional: true },
		/** Upstream resource URL, not the URL in the ingest source. */
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
	/** Website routes for database-backed entity pages. */
	"documents-policies",
	"events",
	"countries",
	"national-consortia",
	"impact-case-studies",
	"institutions",
	"news",
	"pages",
	"persons",
	"projects",
	"spotlights",
	"working-groups",
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

export function createWebsiteDocumentId(type: WebsiteType, identifier: string): string {
	return [type, identifier].join(":");
}

export interface WebsiteCollectionDocument {
	id: string;
	type: WebsiteType;
	label: string;
	description: string;
	publication_date?: number | null;
	/** Database entity slug for internal website pages. */
	slug?: string;
	/** Slug of a related country page for institutions and national consortia. */
	country_slug?: string;
	/** Upstream resource URL, not the URL in the ingest source. */
	url?: string;
}
