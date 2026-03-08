import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { entities } from "./entities";

export const externalLinks = p.pgTable("external_links", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => {
			return entities.id;
		}),
	title: p.text("title").notNull(),
	summary: p.text("summary").notNull(),
	url: p.text("url").notNull(),
	imageId: p
		.uuid("image_id")
		.notNull()
		.references(() => {
			return assets.id;
		}),
	...f.timestamps(),
});

export type ExternalLink = typeof externalLinks.$inferSelect;
export type ExternalLinkInput = typeof externalLinks.$inferInsert;

export const ExternalLinkSelectSchema = createSelectSchema(externalLinks);
export const ExternalLinkInsertSchema = createInsertSchema(externalLinks);
export const ExternalLinkUpdateSchema = createUpdateSchema(externalLinks);
