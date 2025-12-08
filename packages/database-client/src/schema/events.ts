import { isNotNull, isNull } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { blocksFields } from "./blocks-fields";

export const events = p.pgTable(
	"events",
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
		location: p.text("location").notNull(),
		startDate: p.date("start_date", { mode: "date" }).notNull(),
		endDate: p.date("end_date", { mode: "date" }),
		website: p.text("website"),
		slug: p.text("slug").notNull().unique(),
		documentId: f.uuidv7("document_id").notNull(),
		publishedAt: f.timestamp("published_at"),
		...f.timestamps(),
	},
	(t) => {
		return [
			p
				.uniqueIndex("events_document_id_published_unique")
				.on(t.documentId)
				.where(isNotNull(t.publishedAt)),
			p
				.uniqueIndex("events_document_id_unpublished_unique")
				.on(t.documentId)
				.where(isNull(t.publishedAt)),
		];
	},
);

export type Event = typeof events.$inferSelect;
export type EventInput = typeof events.$inferInsert;

export const EventSelectSchema = createSelectSchema(events);
export const EventInsertSchema = createInsertSchema(events);
export const EventUpdateSchema = createUpdateSchema(events);

export const eventsToResources = p.pgTable(
	"events_to_resources",
	{
		eventId: f
			.uuidv7("event_id")
			.notNull()
			.references(() => {
				return events.id;
			}),
		resourceId: p.text("resource_id").notNull(),
	},
	(t) => {
		return [
			p.primaryKey({
				columns: [t.eventId, t.resourceId],
				name: "events_to_resources_pkey",
			}),
		];
	},
);
