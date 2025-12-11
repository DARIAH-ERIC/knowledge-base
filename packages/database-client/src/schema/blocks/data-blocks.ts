import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../../fields";

export const dataBlocks = p.pgTable("data_blocks", {
	id: f.uuidv7("id").primaryKey(),
	kind: p.text("kind", { enum: ["working_groups"] }),
	limit: p.integer("limit"),
});

export type DataBlock = typeof dataBlocks.$inferSelect;
export type DataBlockInput = typeof dataBlocks.$inferInsert;

export const DataBlockSelectSchema = createSelectSchema(dataBlocks);
export const DataBlockInsertSchema = createInsertSchema(dataBlocks);
export const DataBlockUpdateSchema = createUpdateSchema(dataBlocks);
