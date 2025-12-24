import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { entities } from "./entities";

export const events = p.pgTable("events", {
	id: f.uuidv7("id").primaryKey().references(() => {return entities.id}),
	title: p.text("title").notNull(),
	summary: p.text("summary").notNull(),
	imageId: f
		.uuidv7("image_id")
		.notNull()
		.references(() => {
			return assets.id;
		}),
	location: p.text("location").notNull(),
	startDate: p.date("start_date", { mode: "date" }).notNull(),
	startTime: p.time("start_time", { precision: 0 }),
	endDate: p.date("end_date", { mode: "date" }),
	endTime: p.time("end_time", { precision: 0 }),
	website: p.text("website"),
	...f.timestamps(),
});

export type Event = typeof events.$inferSelect;
export type EventInput = typeof events.$inferInsert;

export const EventSelectSchema = createSelectSchema(events);
export const EventInsertSchema = createInsertSchema(events);
export const EventUpdateSchema = createUpdateSchema(events);
