import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { entities } from "./entities";

export const events = p.pgTable("events", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => {
			return entities.id;
		}),
	title: p.text("title").notNull(),
	summary: p.text("summary").notNull(),
	imageId: p
		.uuid("image_id")
		.notNull()
		.references(() => {
			return assets.id;
		}),
	location: p.text("location").notNull(),
	duration: f.timestampRange("duration").notNull(),
	isFullDay: p.boolean().notNull().default(false),
	website: p.text("website"),
	...f.timestamps(),
});

export type Event = typeof events.$inferSelect;
export type EventInput = typeof events.$inferInsert;

export const EventSelectSchema = createSelectSchema(events);
export const EventInsertSchema = createInsertSchema(events);
export const EventUpdateSchema = createUpdateSchema(events);
