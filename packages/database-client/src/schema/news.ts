import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";

export const news = p.pgTable("news", {
	id: f.uuidv7("id").primaryKey(),
	title: p.text("title").notNull(),
	summary: p.text("summary").notNull(),
	leadIn: p.text("lead_in"),
	imageId: f
		.uuidv7("image_id")
		.notNull()
		.references(() => {
			return assets.id;
		}),
	slug: p.text("slug").notNull().unique(),
	...f.timestamps(),
});

export type NewsItem = typeof news.$inferSelect;
export type NewsItemInput = typeof news.$inferInsert;

export const NewsItemSelectSchema = createSelectSchema(news);
export const NewsItemInsertSchema = createInsertSchema(news);
export const NewsItemUpdateSchema = createUpdateSchema(news);
