import * as p from "drizzle-orm/pg-core";

import * as f from "../fields";

export const blocksFields = p.pgTable("blocks_fields", {
	id: f.uuidv7("id").primaryKey(),
});

export const blocks = p.pgTable("blocks", {
	id: f.uuidv7("id").primaryKey(),
	fieldId: f
		.uuidv7("field_id")
		.notNull()
		.references(() => {
			return blocksFields.id;
		}),
	blockId: f.uuidv7("block_id").notNull(),
	blockKind: p.text("block_kind", { enum: ["data", "image", "rich-text"] }).notNull(),
	order: p.integer("order").notNull(),
});
