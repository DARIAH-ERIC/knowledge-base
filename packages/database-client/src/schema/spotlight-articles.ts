import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";

export const spotlightArticles = p.pgTable("spotlight_articles", {
	id: f.uuidv7("id").primaryKey(),
	title: p.text("title").notNull(),
	summary: p.text("summary").notNull(),
	imageId: f
		.uuidv7("image_id")
		.notNull()
		.references(() => {
			return assets.id;
		}),
	slug: p.text("slug").notNull().unique(),
	...f.timestamps(),
});

export type SpotlightArticle = typeof spotlightArticles.$inferSelect;
export type SpotlightArticleInput = typeof spotlightArticles.$inferInsert;

export const SpotlightArticleSelectSchema = createSelectSchema(spotlightArticles);
export const SpotlightArticleInsertSchema = createInsertSchema(spotlightArticles);
export const SpotlightArticleUpdateSchema = createUpdateSchema(spotlightArticles);
