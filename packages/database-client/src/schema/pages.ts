import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { entities } from "./entities";

export const pages = p.pgTable("pages", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => {
			return entities.id;
		}),
	title: p.text("title").notNull(),
	summary: p.text("summary").notNull(),
	imageId: p.uuid("image_id").references(() => {
		return assets.id;
	}),
	...f.timestamps(),
});

export type Page = typeof pages.$inferSelect;
export type PageInput = typeof pages.$inferInsert;

export const PageSelectSchema = createSelectSchema(pages);
export const PageInsertSchema = createInsertSchema(pages);
export const PageUpdateSchema = createUpdateSchema(pages);
