import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";

export const assets = p.pgTable("assets", {
	id: f.uuidv7("id").primaryKey(),
	key: p.text("key").notNull(),
	license: p.text("license", { enum: ["cc-by-4.0", "cc-by-sa-4.0", "cc0-1.0"] }),
	...f.timestamps(),
});

export type Asset = typeof assets.$inferSelect;
export type AssetInput = typeof assets.$inferInsert;

export const AssetSelectSchema = createSelectSchema(assets);
export const AssetInsertSchema = createInsertSchema(assets);
export const AssetUpdateSchema = createUpdateSchema(assets);
