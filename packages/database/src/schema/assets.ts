import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { licenses } from "./licenses";

export const assets = p.pgTable("assets", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	key: p.text("key").notNull(),
	licenseId: p.uuid("license_id").references(() => {
		return licenses.id;
	}),
	...f.timestamps(),
});

export type Asset = typeof assets.$inferSelect;
export type AssetInput = typeof assets.$inferInsert;

export const AssetSelectSchema = createSelectSchema(assets);
export const AssetInsertSchema = createInsertSchema(assets);
export const AssetUpdateSchema = createUpdateSchema(assets);
