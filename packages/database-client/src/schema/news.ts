import { isNull } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";

export const news = p.pgTable(
	"news",
	{
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
	},
	(t) => {
		return [
			p.index("news_slug_index").on(t.slug),
			p.index("news_deleted_at_index").on(t.deletedAt).where(isNull(t.deletedAt)),
		];
	},
);

export type NewsItem = typeof news.$inferSelect;
export type NewsItemInput = typeof news.$inferInsert;

export const NewsItemSelectSchema = createSelectSchema(news);
export const NewsItemInsertSchema = createInsertSchema(news);
export const NewsItemUpdateSchema = createUpdateSchema(news);
