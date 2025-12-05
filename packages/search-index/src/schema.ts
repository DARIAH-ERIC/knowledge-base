import { env } from "../config/env.config";
import { createCollection } from "./create-collection";

export const collection = createCollection({
	name: env.NEXT_PUBLIC_TYPESENSE_COLLECTION_NAME,
	fields: [
		{ name: "kind", type: "string" },
		{ name: "label", type: "string" },
		{ name: "description", type: "string" },
		{ name: "keywords", type: "string[]" },
		{ name: "links", type: "string[]" },
		{ name: "actor_ids", type: "string[]", optional: true },
	],
	queryableFields: ["label", "description", "actor_ids"],
	facetableFields: ["keywords", "kind", "actor_ids"],
	sortableFields: ["label"],
});

export type CollectionQueryield = (typeof collection)["queryableFields"][number];
export type CollectionFacetField = (typeof collection)["facetableFields"][number];
export type CollectionSortield = (typeof collection)["sortableFields"][number];

export const resourceKinds = [
	"publication",
	"tool-or-service",
	"training-material",
	"workflow",
] as const;
export type ResourceKind = (typeof resourceKinds)[number];

export const toolOrServiceTypes = ["community", "core"] as const;
export type ToolOrServiceType = (typeof toolOrServiceTypes)[number];

interface CollectionDocumentBase {
	id: string;
	kind: ResourceKind;
	source: "open-aire" | "ssh-open-marketplace" | "zotero";
	source_id: string;
	imported_at: number;
	label: string;
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
	type: ToolOrServiceType;
	actor_ids: Array<string>;
}

interface TrainingMaterialDocument extends CollectionDocumentBase {
	kind: "training-material";
	source: "ssh-open-marketplace";
	actor_ids: Array<string>;
}

interface WorkflowDocument extends CollectionDocumentBase {
	kind: "workflow";
	source: "ssh-open-marketplace";
	actor_ids: Array<string>;
}

export type CollectionDocument =
	| PublicationDocument
	| ToolOrServiceDocument
	| TrainingMaterialDocument
	| WorkflowDocument;
