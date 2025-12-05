import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../../fields";

export const richTextBlocks = p.pgTable("rich_text_blocks", {
	id: f.uuidv7("id").primaryKey(),
	content: p.jsonb("content"),
});

export type RichTextBlock = typeof richTextBlocks.$inferSelect;
export type RichTextBlockInput = typeof richTextBlocks.$inferInsert;

export const RichTextBlockSelectSchema = createSelectSchema(richTextBlocks);
export const RichTextBlockInsertSchema = createInsertSchema(richTextBlocks);
export const RichTextBlockUpdateSchema = createUpdateSchema(richTextBlocks);
