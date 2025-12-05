import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import { uuidv7 } from "../fields";
import { countries } from "./countries";
import { nationalConsortia as nc } from "./national-consortia";

export const countryTypesEnum = p.pgEnum("country_types", [
	"member",
	"cooperating_partnership",
	"observer",
]);

export const countryStatuses = p.pgTable("country_statuses", {
	id: uuidv7().primaryKey().notNull(),
	startDate: p.date({ mode: "date" }).notNull(),
	endDate: p.date({ mode: "date" }),
	countryId: uuidv7()
		.notNull()
		.references(() => {
			return countries.id;
		}),
	ncId: uuidv7()
		.notNull()
		.references(() => {
			return nc.id;
		}),
	type: countryTypesEnum(),
});

export type CountryStatus = typeof countryStatuses.$inferSelect;
export type CountryStatusInput = typeof countryStatuses.$inferInsert;

export const CountryStatusSelectSchema = createSelectSchema(countryStatuses);
export const CountryStatusInsertSchema = createInsertSchema(countryStatuses);
export const CountryStatusUpdateSchema = createUpdateSchema(countryStatuses);
