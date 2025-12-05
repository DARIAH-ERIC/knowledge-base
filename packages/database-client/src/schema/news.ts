import { isNotNull, isNull, sql } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";

export const news = p.pgTable(
	"news",
	{
		id: f.uuidv7().primaryKey(),
		title: p.text().notNull(),
		summary: p.text().notNull(),
		imageId: f
			.uuidv7()
			.notNull()
			.references(() => {
				return assets.id;
			}),
		description: p.text().notNull(),
		relatedResourceIds: p
			.text()
			.array()
			.default(sql`ARRAY[]::text[]`),
		slug: p.text().notNull().unique(),
		documentId: f.uuidv7().notNull(),
		publishedAt: f.timestamp(),
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
