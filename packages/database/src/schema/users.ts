import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { lower, uuidv7 } from "../functions";

export const userRoleEnum = ["admin", "user"] as const;

export const users = p.pgTable(
	"users",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		email: p.text("email").notNull(),
		username: p.text("username").notNull(),
		passwordHash: p.text("password_hash").notNull(),
		role: p.text("role", { enum: userRoleEnum }).notNull().default("user"),
		isEmailVerified: p.boolean("is_email_verified").notNull().default(false),
		totpKey: p.bytea("totp_key"),
		recoveryCode: p.bytea("recovery_code").notNull(),
		...f.timestamps(),
	},
	(t) => {
		return [
			p.uniqueIndex("users_email_unique").on(lower(t.email)),
			p.check("users_role_enum_check", inArray(t.role, userRoleEnum)),
		];
	},
);

export type User = typeof users.$inferSelect;
export type UserInput = typeof users.$inferInsert;

export const UserSelectSchema = createSelectSchema(users);
export const UserInsertSchema = createInsertSchema(users);
export const UserUpdateSchema = createUpdateSchema(users);

export const sessions = p.pgTable("sessions", {
	id: p.text("id").primaryKey(),
	userId: p
		.uuid("user_id")
		.notNull()
		.references(
			() => {
				return users.id;
			},
			{ onDelete: "cascade" },
		),
	expiresAt: f.timestamp("expires_at").notNull(),
	isTwoFactorVerified: p.boolean("is_two_factor_verified").notNull().default(false),
});

export type Session = typeof sessions.$inferSelect;
export type SessionInput = typeof sessions.$inferInsert;

export const SessionSelectSchema = createSelectSchema(sessions);
export const SessionInsertSchema = createInsertSchema(sessions);
export const SessionUpdateSchema = createUpdateSchema(sessions);

export const passwordResetSessions = p.pgTable("password_reset_sessions", {
	id: p.text("id").primaryKey(),
	userId: p
		.uuid("user_id")
		.notNull()
		.references(
			() => {
				return users.id;
			},
			{ onDelete: "cascade" },
		),
	email: p.text("email").notNull(),
	isEmailVerified: p.boolean("is_email_verified").notNull().default(false),
	code: p.text("code").notNull(),
	expiresAt: f.timestamp("expires_at").notNull(),
	isTwoFactorVerified: p.boolean("is_two_factor_verified").notNull().default(false),
});

export type PasswordResetSession = typeof passwordResetSessions.$inferSelect;
export type PasswordResetSessionInput = typeof passwordResetSessions.$inferInsert;

export const PasswordResetSessionSelectSchema = createSelectSchema(passwordResetSessions);
export const PasswordResetSessionInsertSchema = createInsertSchema(passwordResetSessions);
export const PasswordResetSessionUpdateSchema = createUpdateSchema(passwordResetSessions);

export const emailVerificationRequests = p.pgTable("email_verification_requests", {
	id: p.text("id").primaryKey(),
	userId: p
		.uuid("user_id")
		.notNull()
		.references(
			() => {
				return users.id;
			},
			{ onDelete: "cascade" },
		),
	email: p.text("email").notNull(),
	code: p.text("code").notNull(),
	expiresAt: f.timestamp("expires_at").notNull(),
});

export type EmailVerificationRequest = typeof emailVerificationRequests.$inferSelect;
export type EmailVerificationRequestInput = typeof emailVerificationRequests.$inferInsert;

export const EmailVerificationRequestSelectSchema = createSelectSchema(emailVerificationRequests);
export const EmailVerificationRequestInsertSchema = createInsertSchema(emailVerificationRequests);
export const EmailVerificationRequestUpdateSchema = createUpdateSchema(emailVerificationRequests);
