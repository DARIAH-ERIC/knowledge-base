import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import { timestamps, uuidv7 } from "../fields";
import { lower } from "../functions";

export const users = p.pgTable(
	"users",
	{
		id: uuidv7().primaryKey().notNull(),
		email: p.text().notNull(),
		username: p.text().notNull(),
		...timestamps(),
	},
	(table) => {
		return [p.uniqueIndex("users_email_index").on(lower(table.email))];
	},
);

export type User = typeof users.$inferSelect;
export type UserInput = typeof users.$inferInsert;

export const UserSelectSchema = createSelectSchema(users);
export const UserInsertSchema = createInsertSchema(users);
export const UserUpdateSchema = createUpdateSchema(users);
