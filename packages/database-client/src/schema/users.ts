import { sql } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";

export const users = p.pgTable(
	"users",
	{
		id: f.uuidv7("id").primaryKey(),
		email: p.text("email").notNull(),
		username: p.text("username").notNull(),
		...f.timestamps(),
	},
	(t) => {
		return [p.uniqueIndex("users_email_unique").on(sql`lower(${t.email})`)];
	},
);

export type User = typeof users.$inferSelect;
export type UserInput = typeof users.$inferInsert;

export const UserSelectSchema = createSelectSchema(users);
export const UserInsertSchema = createInsertSchema(users);
export const UserUpdateSchema = createUpdateSchema(users);
