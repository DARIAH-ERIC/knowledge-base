import { isNull } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";

export const pages = p.pgTable(
	"pages",
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
		slug: p.text("slug").notNull().unique(),
		...f.timestamps(),
	},
	(t) => {
		return [
			p.index("pages_slug_index").on(t.slug),
			p.index("pages_deleted_at_index").on(t.deletedAt).where(isNull(t.deletedAt)),
		];
	},
);

export type Page = typeof pages.$inferSelect;
export type PageInput = typeof pages.$inferInsert;

export const PageSelectSchema = createSelectSchema(pages);
export const PageInsertSchema = createInsertSchema(pages);
export const PageUpdateSchema = createUpdateSchema(pages);
