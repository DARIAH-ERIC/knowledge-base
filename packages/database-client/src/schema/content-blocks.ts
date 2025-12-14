import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";

// - we don't enforce global uniqueness of content block fields
//   - that would mean removing contentId fields from events/news, and
//   - adding a polymorphic owner_id / owner_type field on content_blocks_fields

export const contentBlocksFields = p.pgTable("content_blocks_fields", {
	id: f.uuidv7("id").primaryKey(),
});

export type ContentBlocksField = typeof contentBlocksFields.$inferSelect;
export type ContentBlocksFieldInput = typeof contentBlocksFields.$inferInsert;

export const ContentBlocksFieldSelectSchema = createSelectSchema(contentBlocksFields);
export const ContentBlocksFieldInsertSchema = createInsertSchema(contentBlocksFields);
export const ContentBlocksFieldUpdateSchema = createUpdateSchema(contentBlocksFields);

export const contentBlockTypes = ["data", "image", "rich-text"] as const;

export const contentBlocks = p.pgTable(
	"content_blocks",
	{
		id: f.uuidv7("id").primaryKey(),
		fieldId: f
			.uuidv7("field_id")
			.notNull()
			.references(() => {
				return contentBlocksFields.id;
			}),
		// FIXME: should blockId + blockType be primary key instead of unique constraint
		blockId: f.uuidv7("block_id").notNull(),
		blockType: p.text("block_type", { enum: contentBlockTypes }).notNull(),
		sortOrder: p.integer("sort_order").notNull(),
	},
	(t) => {
		return [
			p.check("content_blocks_block_type_enum_check", inArray(t.blockType, contentBlockTypes)),
			p.unique("content_blocks_block_id_block_type_unique").on(t.blockId, t.blockType),
		];
	},
);

export type ContentBlock = typeof contentBlocks.$inferSelect;
export type ContentBlockInput = typeof contentBlocks.$inferInsert;

export const ContentBlockSelectSchema = createSelectSchema(contentBlocks);
export const ContentBlockInsertSchema = createInsertSchema(contentBlocks);
export const ContentBlockUpdateSchema = createUpdateSchema(contentBlocks);

export const dataContentBlockTypes = [
	"events",
	"impact-case-studies",
	"news",
	"projects",
	"working_groups",
] as const;

export const dataContentBlocks = p.pgTable(
	"content_blocks_type_data",
	{
		id: f.uuidv7("id").primaryKey(),
		type: p.text("type", { enum: dataContentBlockTypes }),
		limit: p.integer("limit"),
	},
	(t) => {
		return [
			p.check("content_blocks_type_data_type_enum_check", inArray(t.type, dataContentBlockTypes)),
		];
	},
);

export type DataContentBlock = typeof dataContentBlocks.$inferSelect;
export type DataContentBlockInput = typeof dataContentBlocks.$inferInsert;

export const DataContentBlockSelectSchema = createSelectSchema(dataContentBlocks);
export const DataContentBlockInsertSchema = createInsertSchema(dataContentBlocks);
export const DataContentBlockUpdateSchema = createUpdateSchema(dataContentBlocks);

export const imageContentBlocks = p.pgTable("content_blocks_type_image", {
	id: f.uuidv7("id").primaryKey(),
	imageId: f
		.uuidv7("image_id")
		.notNull()
		.references(() => {
			return assets.id;
		}),
	caption: p.text("caption"),
});

export type ImageContentBlock = typeof imageContentBlocks.$inferSelect;
export type ImageContentBlockInput = typeof imageContentBlocks.$inferInsert;

export const ImageContentBlockSelectSchema = createSelectSchema(imageContentBlocks);
export const ImageContentBlockInsertSchema = createInsertSchema(imageContentBlocks);
export const ImageContentBlockUpdateSchema = createUpdateSchema(imageContentBlocks);

export const richTextContentBlocks = p.pgTable("content_blocks_type_rich_text", {
	id: f.uuidv7("id").primaryKey(),
	content: p.jsonb("content"),
});

export type RichTextContentBlock = typeof richTextContentBlocks.$inferSelect;
export type RichTextContentBlockInput = typeof richTextContentBlocks.$inferInsert;

export const RichTextContentBlockSelectSchema = createSelectSchema(richTextContentBlocks);
export const RichTextContentBlockInsertSchema = createInsertSchema(richTextContentBlocks);
export const RichTextContentBlockUpdateSchema = createUpdateSchema(richTextContentBlocks);
