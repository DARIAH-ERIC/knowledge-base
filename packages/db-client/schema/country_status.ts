import { pgTable, varchar } from "drizzle-orm/pg-core";

import { dateField, identifierField, timestampFields } from "../lib/shared-fields";

export const countryStatusTable = pgTable("country_status", {
	...identifierField,
	name: varchar({ length: 255 }).notNull().unique(),
	start_date: dateField("start_date").notNull(),
	end_date: dateField("end_date"),
	//todo: type
	...timestampFields,
});
