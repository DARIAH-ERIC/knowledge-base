import { env } from "../../config/env.config";
import { createCollection } from "../create-collection";

export const resources = createCollection({
	name: env.NEXT_PUBLIC_TYPESENSE_RESOURCE_COLLECTION_NAME,
	fields: [
		{ name: "type", type: "string" },
		{ name: "label", type: "string" },
		{ name: "description", type: "string" },
		{ name: "keywords", type: "string[]" },
		{ name: "links", type: "string[]" },
		{ name: "source", type: "string" },
		{ name: "source_actor_ids", type: "string[]", optional: true },
		{ name: "upstream_sources", type: "string[]", optional: true },
		{ name: "updated_at", type: "int64", optional: true },
	],
	queryableFields: ["label", "description", "source_actor_ids"],
	facetableFields: ["type", "keywords", "source", "source_actor_ids", "upstream_sources"],
	sortableFields: ["label", "updated_at"],
});

export type ResourceCollectionField = (typeof resources)["fields"][number];
export type ResourceCollectionQueryField = (typeof resources)["queryableFields"][number];
export type ResourceCollectionFacetField = (typeof resources)["facetableFields"][number];
export type ResourceCollectionSortField = (typeof resources)["sortableFields"][number];

export const resourceTypes = [
	"publication",
	"tool-or-service",
	"training-material",
	"workflow",
] as const;
export type ResourceType = (typeof resourceTypes)[number];

export const toolOrServiceKinds = ["community", "core"] as const;
export type ToolOrServiceKind = (typeof toolOrServiceKinds)[number];

interface ResourceCollectionDocumentBase {
	id: string;
	type: ResourceType;
	/** Where the resource was ingested from. */
	source: "open-aire" | "ssh-open-marketplace" | "zotero";
	/** The identifier in the ingest source, e.g. sshoc marketplace item persistentId. */
	source_id: string;
	/**
	 * The sources where the ingest source harvested the resource form, e.g. when sshoc marketplace
	 * harvested items from dariah-campus.
	 */
	upstream_sources: Array<string> | null;
	imported_at: number;
	updated_at: number | null;
	label: string;
	description: string;
	keywords: Array<string>;
	links: Array<string>;
}

interface PublicationResourceDocument extends ResourceCollectionDocumentBase {
	type: "publication";
	source: "open-aire" | "zotero";
	kind: string | null;
	authors: Array<string>;
	year: number | null;
	pid: string | null;
}

interface ToolOrServiceResourceDocument extends ResourceCollectionDocumentBase {
	type: "tool-or-service";
	source: "ssh-open-marketplace";
	kind: ToolOrServiceKind;
	source_actor_ids: Array<string>;
}

interface TrainingMaterialResourceDocument extends ResourceCollectionDocumentBase {
	type: "training-material";
	source: "ssh-open-marketplace";
	source_actor_ids: Array<string>;
}

interface WorkflowResourceDocument extends ResourceCollectionDocumentBase {
	type: "workflow";
	source: "ssh-open-marketplace";
	source_actor_ids: Array<string>;
}

export type ResourceCollectionDocument =
	| PublicationResourceDocument
	| ToolOrServiceResourceDocument
	| TrainingMaterialResourceDocument
	| WorkflowResourceDocument;
