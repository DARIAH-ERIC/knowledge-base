import { isNotNull, isNull } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { blocksFields } from "./blocks-fields";

export const news = p.pgTable(
	"news",
	{
		id: f.uuidv7("id").primaryKey(),
		title: p.text("title").notNull(),
		summary: p.text("summary").notNull(),
		imageId: f
			.uuidv7("image_id")
			.notNull()
			.references(() => {
				return assets.id;
			}),
		contentId: f
			.uuidv7("content_id")
			.notNull()
			.unique()
			.references(() => {
				return blocksFields.id;
			}),
		slug: p.text("slug").notNull().unique(),
		documentId: f.uuidv7("document_id").notNull(),
		publishedAt: f.timestamp("published_at"),
		...f.timestamps(),
	},
	(table) => {
		return [
			p
				.uniqueIndex("news_document_id_published_unique_index")
				.on(table.documentId)
				.where(isNotNull(table.publishedAt)),
			p
				.uniqueIndex("news_document_id_unpublished_unique_index")
				.on(table.documentId)
				.where(isNull(table.publishedAt)),
		];
	},
);

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
