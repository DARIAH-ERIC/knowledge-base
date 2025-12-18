import { isNull } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";

export const persons = p.pgTable(
	"persons",
	{
		id: f.uuidv7("id").primaryKey(),
		name: p.text("name").notNull(),
		description: p.text("description").notNull(),
		imageId: f
			.uuidv7("image_id")
			.notNull()
			.references(() => {
				return assets.id;
			}),
		slug: p.text("slug").notNull().unique(),
		...f.timestamps(),
	},
	(t) => {
		return [
			p.index("persons_slug_index").on(t.slug),
			p.index("persons_deleted_at_index").on(t.deletedAt).where(isNull(t.deletedAt)),
		];
	},
);

export type Person = typeof persons.$inferSelect;
export type PersonInput = typeof persons.$inferInsert;

export const PersonSelectSchema = createSelectSchema(persons);
export const PersonInsertSchema = createInsertSchema(persons);
export const PersonUpdateSchema = createUpdateSchema(persons);
