import { isNotNull, isNull, sql } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";

export const events = p.pgTable(
	"events",
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
		location: p.text().notNull(),
		startDate: p.date({ mode: "date" }).notNull(),
		endDate: p.date({ mode: "date" }),
		website: p.text(),
		relatedResourceIds: p
			.text()
			.array()
			.default(sql`ARRAY[]::text[]`),
		slug: p.text().notNull().unique(),
		documentId: f.uuidv7().notNull(),
		publishedAt: p.date({ mode: "date" }),
		...f.timestamps(),
	},
	(table) => {
		return [
			p
				.uniqueIndex("events_document_id_published_unique_index")
				.on(table.documentId)
				.where(isNotNull(table.publishedAt)),
			p
				.uniqueIndex("events_document_id_unpublished_unique_index")
				.on(table.documentId)
				.where(isNull(table.publishedAt)),
		];
	},
);

export type Event = typeof events.$inferSelect;
export type EventInput = typeof events.$inferInsert;

export const EventSelectSchema = createSelectSchema(events);
export const EventInsertSchema = createInsertSchema(events);
export const EventUpdateSchema = createUpdateSchema(events);
