import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { licenses } from "./licenses";

export const assets = p.pgTable("assets", {
	id: f.uuidv7("id").primaryKey(),
	key: p.text("key").notNull(),
	licenseId: f.uuidv7("license_id").references(() => {
		return licenses.id;
	}),
	...f.timestamps(),
});

export type Asset = typeof assets.$inferSelect;
export type AssetInput = typeof assets.$inferInsert;

export const AssetSelectSchema = createSelectSchema(assets);
export const AssetInsertSchema = createInsertSchema(assets);
export const AssetUpdateSchema = createUpdateSchema(assets);
