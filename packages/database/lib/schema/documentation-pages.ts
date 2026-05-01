import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { entities } from "./entities";

export const documentationPages = p.pgTable("documentation_pages", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => {
			return entities.id;
		}),
	title: p.text("title").notNull(),
	...f.timestamps(),
});

export type DocumentationPage = typeof documentationPages.$inferSelect;
export type DocumentationPageInput = typeof documentationPages.$inferInsert;

export const DocumentationPageSelectSchema = createSelectSchema(documentationPages);
export const DocumentationPageInsertSchema = createInsertSchema(documentationPages);
export const DocumentationPageUpdateSchema = createUpdateSchema(documentationPages);
