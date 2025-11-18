import { pgTable, text, varchar } from "drizzle-orm/pg-core";

import { identifierField, timestampFields } from "../lib/shared-fields";

export const countriesTable = pgTable("countries", {
	...identifierField,
	name: varchar({ length: 255 }).notNull().unique(),
	description: text(),
	// code field: enum?
	...timestampFields,
});
