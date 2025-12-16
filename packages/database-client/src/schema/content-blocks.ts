import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { fields } from "./entities";

export const contentBlockTypes = ["data", "embed", "image", "rich_text"] as const;

export const contentBlocks = p.pgTable(
	"content_blocks",
	{
		id: f.uuidv7("id").primaryKey(),
		fieldId: f
			.uuidv7("field_id")
			.notNull()
			.references(() => {
				return fields.id;
			}),
		type: p.text("type", { enum: contentBlockTypes }).notNull(),
		position: p.integer("position").notNull(),
	},
	(t) => {
		return [p.check("content_blocks_type_enum_check", inArray(t.type, contentBlockTypes))];
	},
);

export type ContentBlock = typeof contentBlocks.$inferSelect;
export type ContentBlockInput = typeof contentBlocks.$inferInsert;

export const ContentBlockSelectSchema = createSelectSchema(contentBlocks);
export const ContentBlockInsertSchema = createInsertSchema(contentBlocks);
export const ContentBlockUpdateSchema = createUpdateSchema(contentBlocks);

export const dataContentBlockTypes = ["events", "news"] as const;

export const dataContentBlocks = p.pgTable(
	"content_blocks_type_data",
	{
		id: f
			.uuidv7("id")
			.primaryKey()
			.references(() => {
				return contentBlocks.id;
			}),
		type: p.text("type", { enum: dataContentBlockTypes }).notNull(),
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

export const embedContentBlocks = p.pgTable("content_blocks_type_embed", {
	id: f
		.uuidv7("id")
		.primaryKey()
		.references(() => {
			return contentBlocks.id;
		}),
	url: p.text("caption").notNull(),
	caption: p.text("caption"),
});

export type EmbedContentBlock = typeof embedContentBlocks.$inferSelect;
export type EmbedContentBlockInput = typeof embedContentBlocks.$inferInsert;

export const EmbedContentBlockSelectSchema = createSelectSchema(embedContentBlocks);
export const EmbedContentBlockInsertSchema = createInsertSchema(embedContentBlocks);
export const EmbedContentBlockUpdateSchema = createUpdateSchema(embedContentBlocks);

export const imageContentBlocks = p.pgTable("content_blocks_type_image", {
	id: f
		.uuidv7("id")
		.primaryKey()
		.references(() => {
			return contentBlocks.id;
		}),
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
	id: f
		.uuidv7("id")
		.primaryKey()
		.references(() => {
			return contentBlocks.id;
		}),
	content: p.jsonb("content").notNull(),
});

export type RichTextContentBlock = typeof richTextContentBlocks.$inferSelect;
export type RichTextContentBlockInput = typeof richTextContentBlocks.$inferInsert;

export const RichTextContentBlockSelectSchema = createSelectSchema(richTextContentBlocks);
export const RichTextContentBlockInsertSchema = createInsertSchema(richTextContentBlocks);
export const RichTextContentBlockUpdateSchema = createUpdateSchema(richTextContentBlocks);
