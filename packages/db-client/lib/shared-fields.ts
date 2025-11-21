import { sql } from "drizzle-orm";
import { date, type PgDateStringBuilderInitial, timestamp, uuid } from "drizzle-orm/pg-core";

export const timestampFields = {
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull(),
};

export const identifierField = {
	id: uuid("id")
		.primaryKey()
		.default(sql`uuidv7()`),
};

export const dateField = (name: string): PgDateStringBuilderInitial<string> => {
	return date(name);
};
