import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";

export const website = p.pgTable("website", {
	id: f.uuidv7("id").primaryKey(),
	navigation: p.jsonb("navigation").notNull(),
	...f.timestamps(),
});

export type Website = typeof website.$inferSelect;
export type WebsiteInput = typeof website.$inferInsert;

export const WebsiteSelectSchema = createSelectSchema(website);
export const WebsiteInsertSchema = createInsertSchema(website);
export const WebsiteUpdateSchema = createUpdateSchema(website);
