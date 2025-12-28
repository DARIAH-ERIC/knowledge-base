import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { entities } from "./entities";

export const persons = p.pgTable("persons", {
	id: f
		.uuidv7("id")
		.primaryKey()
		.references(() => {
			return entities.id;
		}),
	firstName: p.text("first_name"),
	lastName: p.text("last_name").notNull(),
	description: p.text("description").notNull(),
	imageId: f
		.uuidv7("image_id")
		.notNull()
		.references(() => {
			return assets.id;
		}),
	...f.timestamps(),
});

export type Person = typeof persons.$inferSelect;
export type PersonInput = typeof persons.$inferInsert;

export const PersonSelectSchema = createSelectSchema(persons);
export const PersonInsertSchema = createInsertSchema(persons);
export const PersonUpdateSchema = createUpdateSchema(persons);
