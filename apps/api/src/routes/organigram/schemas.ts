import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

export const OrganigramNodeSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	slug: v.string(),
	label: v.string(),
	description: v.nullable(v.string()),
	kind: v.picklist(schema.organigramNodeKindsEnum),
	position: v.nullable(v.number()),
	unit: v.nullable(
		v.object({
			id: v.pipe(v.string(), v.uuid()),
			slug: v.string(),
			name: v.string(),
			acronym: v.nullable(v.string()),
			summary: v.nullable(v.string()),
			type: v.picklist(schema.organisationalUnitTypesEnum),
			metadata: v.nullable(v.unknown()),
		}),
	),
});

export type OrganigramNode = v.InferOutput<typeof OrganigramNodeSchema>;

export const OrganigramEdgeSchema = v.object({
	id: v.string(),
	fromNodeId: v.pipe(v.string(), v.uuid()),
	toNodeId: v.pipe(v.string(), v.uuid()),
	relation: v.picklist(schema.organigramEdgeRelationsEnum),
	position: v.nullable(v.number()),
});

export type OrganigramEdge = v.InferOutput<typeof OrganigramEdgeSchema>;

export const GetOrganigram = {
	ResponseSchema: v.pipe(
		v.object({
			nodes: v.array(OrganigramNodeSchema),
			edges: v.array(OrganigramEdgeSchema),
		}),
		v.description("Organigram nodes and edges"),
		v.metadata({ ref: "GetOrganigramResponse" }),
	),
};
