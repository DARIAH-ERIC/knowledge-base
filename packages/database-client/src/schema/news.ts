import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";

export const news = p.pgTable("news", {
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

export type NewsItem = typeof news.$inferSelect;
export type NewsItemInput = typeof news.$inferInsert;

export const NewsItemSelectSchema = createSelectSchema(news);
export const NewsItemInsertSchema = createInsertSchema(news);
export const NewsItemUpdateSchema = createUpdateSchema(news);

export const newsToResources = p.pgTable(
	"news_to_resources",
	{
		newsItemId: f
			.uuidv7("news_item_id")
			.notNull()
			.references(() => {
				return news.id;
			}),
		resourceId: p.text("resource_id").notNull(),
	},
	(t) => {
		return [
			p.primaryKey({
				columns: [t.newsItemId, t.resourceId],
				name: "news_to_resources_pkey",
			}),
		];
	},
);
