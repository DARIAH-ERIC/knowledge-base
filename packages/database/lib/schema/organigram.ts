import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { entities } from "./entities";

export const organigramNodeKindsEnum = ["governance_body", "collective"] as const;

export const organigramNodes = p.snakeCase.table(
	"organigram_nodes",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		slug: p.text("slug").notNull().unique(),
		label: p.text("label").notNull(),
		description: p.text("description"),
		kind: p.text("kind", { enum: organigramNodeKindsEnum }).notNull(),
		entityId: p
			.uuid("entity_id")
			.unique()
			.references(() => entities.id),
		position: p.integer("position"),
		...f.timestamps(),
	},
	(t) => [p.check("organigram_nodes_kind_enum_check", inArray(t.kind, organigramNodeKindsEnum))],
);

export type OrganigramNode = typeof organigramNodes.$inferSelect;
export type OrganigramNodeInput = typeof organigramNodes.$inferInsert;

export const OrganigramNodeSelectSchema = createSelectSchema(organigramNodes);
export const OrganigramNodeInsertSchema = createInsertSchema(organigramNodes);
export const OrganigramNodeUpdateSchema = createUpdateSchema(organigramNodes);

export const organigramEdgeRelationsEnum = [
	"appoints",
	"advises",
	"oversees",
	"supports",
	"is_represented_in",
] as const;

export const organigramEdges = p.snakeCase.table(
	"organigram_edges",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		fromNodeId: p
			.uuid("from_node_id")
			.notNull()
			.references(() => organigramNodes.id),
		toNodeId: p
			.uuid("to_node_id")
			.notNull()
			.references(() => organigramNodes.id),
		relation: p.text("relation", { enum: organigramEdgeRelationsEnum }).notNull(),
		position: p.integer("position"),
		...f.timestamps(),
	},
	(t) => [
		p.check(
			"organigram_edges_relation_enum_check",
			inArray(t.relation, organigramEdgeRelationsEnum),
		),
		p.unique().on(t.fromNodeId, t.toNodeId, t.relation),
	],
);

export type OrganigramEdge = typeof organigramEdges.$inferSelect;
export type OrganigramEdgeInput = typeof organigramEdges.$inferInsert;

export const OrganigramEdgeSelectSchema = createSelectSchema(organigramEdges);
export const OrganigramEdgeInsertSchema = createInsertSchema(organigramEdges);
export const OrganigramEdgeUpdateSchema = createUpdateSchema(organigramEdges);
