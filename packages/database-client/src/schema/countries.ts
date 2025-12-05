import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import { uuidv7 } from "../fields";

export const countries = p.pgTable("countries", {
	id: uuidv7().primaryKey().notNull(),
	code: p.text().notNull(),
	name: p.text().notNull(),
	description: p.text(),
});

export type Country = typeof countries.$inferSelect;
export type CountryInput = typeof countries.$inferInsert;

export const CountrySelectSchema = createSelectSchema(countries);
export const CountryInsertSchema = createInsertSchema(countries);
export const CountryUpdateSchema = createUpdateSchema(countries);
