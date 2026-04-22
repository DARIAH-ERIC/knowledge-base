import { type CollectionDocument, defineCollection } from "../schema";

export const websiteCollection = defineCollection({
	fields: [
		{ name: "id", type: "string", index: false },
		{ name: "source", type: "string", index: true, facet: true },
		{ name: "source_id", type: "string", index: false },
		{ name: "source_updated_at", type: "int64", index: true, optional: true, sort: true },
		{ name: "imported_at", type: "int64", index: false },
		{ name: "type", type: "string", index: true, facet: true },
		{ name: "label", type: "string", index: true, sort: true },
		{ name: "description", type: "string", index: true },
		{ name: "link", type: "string", index: false, optional: true },
	] as const,
});

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

export const websiteResourceTypes = [
	"publication",
	"service",
	"software",
	"training-material",
	"workflow",
] as const;
export type WebsiteResourceType = (typeof websiteResourceTypes)[number];

export type WebsiteDocumentType = WebsiteEntityType | WebsiteResourceType;

export interface WebsiteEntityDocument extends CollectionDocument<typeof websiteCollection> {
	kind: "entity";
	type: WebsiteEntityType;
}

export interface WebsiteResourceDocument extends CollectionDocument<typeof websiteCollection> {
	kind: "resource";
	type: WebsiteResourceType;
}

export interface WebsiteDocument extends CollectionDocument<typeof websiteCollection> {
	kind: "entity" | "resource";
	type: WebsiteDocumentType;
}

export interface SearchWebsiteParams {
	query: string;
	page?: number;
	perPage?: number;
}

export interface WebsiteHit {
	document: WebsiteDocument;
	highlight: Partial<Record<keyof WebsiteDocument, string>>;
}

export interface WebsiteSearchResult {
	hits: Array<WebsiteHit>;
	found: number;
	page: number;
}
