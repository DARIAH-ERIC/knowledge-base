import { pgTable, text, varchar } from "drizzle-orm/pg-core";

import { identifierField, timestampFields } from "../lib/shared-fields";

export const nationalConsortiaTable = pgTable("national_consortia", {
	...identifierField,
	name: varchar({ length: 255 }).notNull().unique(),
	//logo: uri or relation to asset?
	description: text(),
	marketPlaceId: varchar({ length: 255 }),
	...timestampFields,
});
