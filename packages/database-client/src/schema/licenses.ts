import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";

export const licenses = p.pgTable("licenses", {
	id: f.uuidv7("id").primaryKey(),
	name: p.text("name").notNull().unique(),
	url: p.text("url").notNull(),
	...f.timestamps(),
});

export type License = typeof licenses.$inferSelect;
export type LicenseInput = typeof licenses.$inferInsert;

export const LicenseSelectSchema = createSelectSchema(licenses);
export const LicenseInsertSchema = createInsertSchema(licenses);
export const LicenseUpdateSchema = createUpdateSchema(licenses);
