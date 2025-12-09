import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import { uuidv7 } from "../fields";

export const nationalConsortia = p.pgTable("national_consortia", {
	id: uuidv7().primaryKey().notNull(),
	/*logoId:	uuidv7().notNull().references(() => {
			return assets.id;
	}),*/
	name: p.text().notNull(),
	marketPlaceId: p.text(),
});

export type NationalConsortium = typeof nationalConsortia.$inferSelect;
export type NationalConsortiumInput = typeof nationalConsortia.$inferInsert;

export const NationalConsortiumSelectSchema = createSelectSchema(nationalConsortia);
export const NationalConsortiumInsertSchema = createInsertSchema(nationalConsortia);
export const NationalConsortiumUpdateSchema = createUpdateSchema(nationalConsortia);
