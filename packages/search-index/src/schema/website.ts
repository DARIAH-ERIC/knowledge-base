import { env } from "../../config/env.config";
import { createCollection } from "../create-collection";

export const website = createCollection({
	name: env.NEXT_PUBLIC_TYPESENSE_WEBSITE_COLLECTION_NAME,
	fields: [
		{ name: "type", type: "string" },
		{ name: "label", type: "string" },
		{ name: "description", type: "string" },
		{ name: "links", type: "string[]" },
	],
	queryableFields: ["label", "description"],
	facetableFields: ["type"],
	sortableFields: ["label"],
});

export type WebsiteCollectionField = (typeof website)["fields"][number];
export type WebsiteCollectionQueryField = (typeof website)["queryableFields"][number];
export type WebsiteCollectionFacetField = (typeof website)["facetableFields"][number];
export type WebsiteCollectionSortField = (typeof website)["sortableFields"][number];

export const types = [
	"event",
	"impact-case-study",
	"news",
	"page",
	"resource",
	"spotlight-article",
] as const;
export type Type = (typeof types)[number];

export interface WebsiteCollectionDocument {
	id: string;
	type: Type;
	imported_at: number;
	label: string;
	description: string;
}
