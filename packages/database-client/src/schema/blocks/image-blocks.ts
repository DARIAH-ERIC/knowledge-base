import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../../fields";
import { assets } from "../assets";

export const imageBlocks = p.pgTable("image_blocks", {
	id: f.uuidv7("id").primaryKey(),
	imageId: f
		.uuidv7("image_id")
		.notNull()
		.references(() => {
			return assets.id;
		}),
	caption: p.text("caption"),
});

export type ImageBlock = typeof imageBlocks.$inferSelect;
export type ImageBlockInput = typeof imageBlocks.$inferInsert;

export const ImageBlockSelectSchema = createSelectSchema(imageBlocks);
export const ImageBlockInsertSchema = createInsertSchema(imageBlocks);
export const ImageBlockUpdateSchema = createUpdateSchema(imageBlocks);
