import * as p from "drizzle-orm/pg-core";

import * as f from "../fields";
import { contents } from "./contents";

export const blocks = p.pgTable(
	"blocks",
	{
		id: f.uuidv7("id").primaryKey(),
		contentId: f
			.uuidv7("content_id")
			.notNull()
			.references(() => {
				return contents.id;
			}),
		blockId: f.uuidv7("block_id").notNull(),
		blockKind: p.text("block_kind", { enum: ["data", "image", "rich-text"] }).notNull(),
		order: p.integer("order").notNull(),
	},
	(t) => {
		return [p.unique("blocks_block_id_block_kind_unique").on(t.blockId, t.blockKind)];
	},
);

export * from "./blocks/data-blocks";
export * from "./blocks/image-blocks";
export * from "./blocks/rich-text-blocks";
