import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { entities } from "./entities";

export const documentsPolicies = p.pgTable("documents_policies", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => {
			return entities.id;
		}),
	title: p.text("title").notNull(),
	summary: p.text("summary").notNull(),
	url: p.text("url"),
	documentId: p
		.uuid("document_id")
		.notNull()
		.references(() => {
			return assets.id;
		}),
	...f.timestamps(),
});

export type DocumentOrPolicy = typeof documentsPolicies.$inferSelect;
export type DocumentOrPolicyInput = typeof documentsPolicies.$inferInsert;

export const DocumentOrPolicySelectSchema = createSelectSchema(documentsPolicies);
export const DocumentOrPolicyInsertSchema = createInsertSchema(documentsPolicies);
export const DocumentOrPolicyUpdateSchema = createUpdateSchema(documentsPolicies);
