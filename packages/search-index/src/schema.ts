import { env } from "../config/env.config";
import { createCollection } from "./create-collection";

export const collection = createCollection({
	name: env.NEXT_PUBLIC_TYPESENSE_COLLECTION_NAME,
	fields: [
		{ name: "kind", type: "string" },
		{ name: "title", type: "string" },
		{ name: "description", type: "string" },
		{ name: "keywords", type: "string[]" },
		{ name: "links", type: "string[]" },
	],
	queryableFields: ["title", "description"],
	facetableFields: ["keywords", "kind"],
	sortableFields: ["title"],
});

export type CollectionQueryield = (typeof collection)["queryableFields"][number];
export type CollectionFacetField = (typeof collection)["facetableFields"][number];
export type CollectionSortield = (typeof collection)["sortableFields"][number];

interface CollectionDocumentBase {
	id: string;
	kind: "publication" | "tool-or-service" | "training-material" | "workflow";
	source: "open-aire" | "ssh-open-marketplace" | "zotero";
	source_id: string;
	imported_at: number;
	title: string;
	description: string;
	keywords: Array<string>;
	links: Array<string>;
}

interface PublicationDocument extends CollectionDocumentBase {
	kind: "publication";
	source: "open-aire" | "zotero";
	type: string | null;
	authors: Array<string>;
	year: number | null;
	pid: string | null;
}

interface ToolOrServiceDocument extends CollectionDocumentBase {
	kind: "tool-or-service";
	source: "ssh-open-marketplace";
	type: "community" | "core";
}

interface TrainingMaterialDocument extends CollectionDocumentBase {
	kind: "training-material";
	source: "ssh-open-marketplace";
}

interface WorkflowDocument extends CollectionDocumentBase {
	kind: "workflow";
	source: "ssh-open-marketplace";
}

export type CollectionDocument =
	| PublicationDocument
	| ToolOrServiceDocument
	| TrainingMaterialDocument
	| WorkflowDocument;
