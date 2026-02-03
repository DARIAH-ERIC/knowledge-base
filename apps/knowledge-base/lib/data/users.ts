/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { getRandomValues } from "node:crypto";

import {
	decrypt,
	decryptToString,
	encodeBase32,
	encodeBase32LowerCaseNoPadding,
	encodeHexLowerCase,
	encrypt,
	encryptString,
	generateRandomOTP,
	generateRandomRecoveryCode,
	hashPassword,
	sha256,
} from "@dariah-eric/auth";
import { and, count, eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { DatabaseError, EmailInUseError, InvalidUserIdError } from "@dariah-eric/errors";
import { cookies } from "next/headers";
import { cache } from "react";

import {
	emailVerificationRequestCookieName,
	emailVerificationRequestMaxDurationMs,
	passwordResetCookieName,
	passwordResetSessionMaxDurationMs,
	sessionCookieName,
	sessionMaxDurationMs,
	sessionRefreshIntervalMs,
} from "@/config/auth.config";
import { env } from "@/config/env.config";
import { sendEmail } from "@/lib/server/email/send-email";
import { ExpiringTokenBucket } from "@/lib/server/rate-limit/rate-limiter";

interface CreateUserParams extends Pick<schema.UserInput, "email" | "username"> {
	password: string;
}

export async function createUser(params: CreateUserParams) {
	const { email, password, username } = params;

	const passwordHash = await hashPassword(password);
	const recoveryCode = generateRandomRecoveryCode();
	const encryptedRecoveryCode = Buffer.from(encryptString(recoveryCode));

	const [row] = await db
		.insert(schema.users)
		.values({ email, username, passwordHash, recoveryCode: encryptedRecoveryCode })
		.returning({ id: schema.users.id, role: schema.users.role });

	if (row == null) {
		// FIXME: better error
		throw new DatabaseError({ message: "Failed to create user." });
	}

	const user: User = {
		id: row.id,
		username,
		email,
		role: row.role,
		isEmailVerified: false,
		isTwoFactorRegistered: false,
	};

	return user;
}

export async function isUserEmailAvailable(email: string): Promise<boolean> {
	const [row] = await db
		.select({ count: count() })
		.from(schema.users)
		.where(eq(schema.users.email, email));

	if (row == null) {
		// FIXME: better error
		throw new EmailInUseError({ message: "Email already in use" });
	}

	return row.count === 0;
}

export async function updateUserPassword(
	userId: schema.User["id"],
	password: string,
): Promise<void> {
	const passwordHash = await hashPassword(password);
	await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, userId));
}

export async function updateUserEmailAndSetEmailAsVerified(
	userId: schema.User["id"],
	email: schema.User["email"],
): Promise<void> {
	await db
		.update(schema.users)
		.set({ email, isEmailVerified: true })
		.where(eq(schema.users.id, userId));
}

export async function setUserAsEmailVerifiedIfEmailMatches(
	userId: schema.User["id"],
	email: schema.User["email"],
): Promise<boolean> {
	const rows = await db
		.update(schema.users)
		.set({ isEmailVerified: true })
		.where(and(eq(schema.users.id, userId), eq(schema.users.email, email)))
		.returning({ id: schema.users.id });

	return rows.length > 0;
}

export async function getUserPasswordHash(userId: string): Promise<string> {
	const [row] = await db
		.select({ passwordHash: schema.users.passwordHash })
		.from(schema.users)
		.where(eq(schema.users.id, userId));

	if (row == null) {
		throw new InvalidUserIdError({ message: "Invalid user id" });
	}

	return row.passwordHash;
}

export async function getUserRecoverCode(userId: string): Promise<string> {
	const [row] = await db
		.select({ recoveryCode: schema.users.recoveryCode })
		.from(schema.users)
		.where(eq(schema.users.id, userId));

	if (row == null) {
		throw new InvalidUserIdError({ message: "Invalid user id" });
	}

	return decryptToString(new Uint8Array(row.recoveryCode));
}

export async function getUserTOTPKey(userId: string): Promise<Uint8Array | null> {
	const [row] = await db
		.select({ totpKey: schema.users.totpKey })
		.from(schema.users)
		.where(eq(schema.users.id, userId));

	if (row == null) {
		throw new InvalidUserIdError({ message: "Invalid user id" });
	}

	const encrypted = row.totpKey ? new Uint8Array(row.totpKey) : null;

	if (encrypted == null) {
		return null;
	}

	return decrypt(encrypted);
}

export async function updateUserTOTPKey(userId: string, key: Uint8Array): Promise<void> {
	const encrypted = Buffer.from(encrypt(key));
	await db.update(schema.users).set({ totpKey: encrypted }).where(eq(schema.users.id, userId));
}

export async function resetUserRecoveryCode(userId: string): Promise<string> {
	const recoveryCode = generateRandomRecoveryCode();
	const encrypted = Buffer.from(encryptString(recoveryCode));
	await db.update(schema.users).set({ recoveryCode: encrypted }).where(eq(schema.users.id, userId));

	return recoveryCode;
}

export async function getUserFromEmail(email: string) {
	const [row] = await db
		.select({
			id: schema.users.id,
			email: schema.users.email,
			username: schema.users.username,
			role: schema.users.role,
			isEmailVerified: schema.users.isEmailVerified,
			totpKey: schema.users.totpKey,
		})
		.from(schema.users)
		.where(eq(schema.users.email, email));

	if (row == null) {
		return null;
	}

	const user: User = {
		id: row.id,
		role: row.role,
		email: row.email,
		username: row.username,
		isEmailVerified: row.isEmailVerified,
		isTwoFactorRegistered: row.totpKey != null,
	};

	return user;
}

//

function createSessionIdFromSessionToken(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessionId = createSessionIdFromSessionToken(token);

	const [row] = await db
		.select({ user: schema.users, session: schema.sessions })
		.from(schema.sessions)
		.innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
		.where(eq(schema.sessions.id, sessionId));

	if (row == null) {
		return { session: null, user: null };
	}

	const session: Session = {
		id: row.session.id,
		userId: row.session.userId,
		expiresAt: row.session.expiresAt,
		isTwoFactorVerified: row.session.isTwoFactorVerified,
	};

	const user: User = {
		id: row.user.id,
		email: row.user.email,
		username: row.user.username,
		role: row.user.role,
		isEmailVerified: row.user.isEmailVerified,
		isTwoFactorRegistered: row.user.totpKey != null,
	};

	if (Date.now() >= session.expiresAt.getTime()) {
		await db.delete(schema.sessions).where(eq(schema.sessions.id, session.id));
		return { session: null, user: null };
	}

	if (Date.now() >= session.expiresAt.getTime() - sessionRefreshIntervalMs) {
		session.expiresAt = new Date(Date.now() + sessionMaxDurationMs);

		await db
			.update(schema.sessions)
			.set({ expiresAt: session.expiresAt })
			.where(eq(schema.sessions.id, session.id));
	}

	return { session, user };
}

export const getCurrentSession = cache(async (): Promise<SessionValidationResult> => {
	const token = await getSessionToken();

	if (token == null) {
		return { session: null, user: null };
	}

	const result = await validateSessionToken(token);

	return result;
});

export async function invalidateSession(sessionId: Session["id"]): Promise<void> {
	await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

export async function invalidateUserSessions(userId: string): Promise<void> {
	await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

/** Alternatively use uuid v4 from `crypto.randomUUID()`. */
export function generateSessionToken(): string {
	const tokenBytes = new Uint8Array(20);
	getRandomValues(tokenBytes);
	const token = encodeBase32LowerCaseNoPadding(tokenBytes).toLowerCase();

	return token;
}

export async function createSession(
	token: string,
	userId: string,
	flags: SessionFlags,
): Promise<Session> {
	const sessionId = createSessionIdFromSessionToken(token);

	const session: Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + sessionMaxDurationMs),
		isTwoFactorVerified: flags.isTwoFactorVerified,
	};

	await db.insert(schema.sessions).values({
		id: session.id,
		userId: session.userId,
		expiresAt: session.expiresAt,
		isTwoFactorVerified: session.isTwoFactorVerified,
	});

	return session;
}

export async function setSessionAs2FAVerified(sessionId: schema.Session["id"]): Promise<void> {
	await db
		.update(schema.sessions)
		.set({ isTwoFactorVerified: true })
		.where(eq(schema.sessions.id, sessionId));
}

//

interface User extends Pick<schema.User, "id" | "email" | "username" | "role" | "isEmailVerified"> {
	isTwoFactorRegistered: boolean;
}

interface Session extends schema.Session {}

type SessionFlags = Pick<Session, "isTwoFactorVerified">;

export interface AuthenticatedSession {
	session: Session;
	user: User;
}

export interface UnauthenticatedSession {
	session: null;
	user: null;
}

export type SessionValidationResult = AuthenticatedSession | UnauthenticatedSession;

//

export async function getSessionToken(): Promise<string | null> {
	return (await cookies()).get(sessionCookieName)?.value ?? null;
}

export async function setSessionTokenCookie(token: string, expiresAt: Date): Promise<void> {
	(await cookies()).set(sessionCookieName, token, {
		httpOnly: true,
		sameSite: "lax",
		secure: env.NODE_ENV === "production",
		expires: expiresAt,
		path: "/",
	});
}

export async function deleteSessionTokenCookie(): Promise<void> {
	(await cookies()).set(sessionCookieName, "", {
		httpOnly: true,
		sameSite: "lax",
		secure: env.NODE_ENV === "production",
		maxAge: 0,
		path: "/",
	});
}

//

// FIXME: config
export const totpBucket = new ExpiringTokenBucket<string>(5, 60 * 30);
export const recoveryCodeBucket = new ExpiringTokenBucket<string>(3, 60 * 60);

export async function resetUser2FAWithRecoveryCode(
	userId: string,
	recoveryCode: string,
): Promise<boolean> {
	// FIXME: wrap in transaction
	const [row] = await db.select().from(schema.users).where(eq(schema.users.id, userId));

	if (row == null) {
		return false;
	}

	const encryptedRecoveryCode = new Uint8Array(row.recoveryCode);
	const userRecoveryCode = decryptToString(encryptedRecoveryCode);

	if (recoveryCode !== userRecoveryCode) {
		return false;
	}

	const newRecoveryCode = generateRandomRecoveryCode();
	const encryptedNewRecoveryCode = encryptString(newRecoveryCode);

	await db
		.update(schema.sessions)
		.set({ isTwoFactorVerified: false })
		.where(eq(schema.sessions.userId, userId));

	const result = await db
		.update(schema.users)
		.set({ recoveryCode: Buffer.from(encryptedNewRecoveryCode), totpKey: null })
		.where(
			and(
				eq(schema.users.id, userId),
				eq(schema.users.recoveryCode, Buffer.from(encryptedRecoveryCode)),
			),
		)
		.returning({ id: schema.users.id });

	return result.length > 0;
}

//

export async function getUserEmailVerificationRequest(
	userId: schema.User["id"],
	id: schema.EmailVerificationRequest["id"],
): Promise<schema.EmailVerificationRequest | null> {
	const [row] = await db
		.select()
		.from(schema.emailVerificationRequests)
		.where(
			and(
				eq(schema.emailVerificationRequests.id, id),
				eq(schema.emailVerificationRequests.userId, userId),
			),
		);

	if (row == null) {
		return null;
	}

	const request: schema.EmailVerificationRequest = {
		id: row.id,
		userId: row.userId,
		code: row.code,
		email: row.email,
		expiresAt: row.expiresAt,
	};

	return request;
}

export async function createEmailVerificationRequest(
	userId: User["id"],
	email: User["email"],
): Promise<schema.EmailVerificationRequest> {
	await deleteUserEmailVerificationRequest(userId);

	const idBytes = new Uint8Array(20);
	getRandomValues(idBytes);
	const id = encodeBase32(idBytes).toLowerCase();

	const code = generateRandomOTP();
	const expiresAt = new Date(Date.now() + emailVerificationRequestMaxDurationMs);

	await db
		.insert(schema.emailVerificationRequests)
		.values({ id, userId, code, email, expiresAt })
		.returning({ id: schema.emailVerificationRequests.id });

	const request: schema.EmailVerificationRequest = {
		id,
		userId,
		code,
		email,
		expiresAt,
	};

	return request;
}

export async function getUserEmailVerificationRequestFromRequest(): Promise<schema.EmailVerificationRequest | null> {
	const { user } = await getCurrentSession();

	if (user == null) {
		return null;
	}

	const id = await getEmailVerificationRequestId();

	if (id == null) {
		return null;
	}

	const request = await getUserEmailVerificationRequest(user.id, id);

	if (request == null) {
		await deleteEmailVerificationRequestCookie();
	}

	return request;
}

export async function deleteUserEmailVerificationRequest(userId: schema.User["id"]): Promise<void> {
	await db
		.delete(schema.emailVerificationRequests)
		.where(eq(schema.emailVerificationRequests.userId, userId));
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
	await sendEmail({
		from: env.EMAIL_ADDRESS,
		to: email,
		subject: "Verification code",
		text: `Your verification code is ${code}`,
	});
}

export const sendVerificationEmailBucket = new ExpiringTokenBucket<string>(3, 60 * 10);

//

export async function getEmailVerificationRequestId(): Promise<string | null> {
	return (await cookies()).get(emailVerificationRequestCookieName)?.value ?? null;
}

export async function setEmailVerificationRequestCookie(
	request: schema.EmailVerificationRequest,
): Promise<void> {
	(await cookies()).set(emailVerificationRequestCookieName, request.id, {
		httpOnly: true,
		sameSite: "lax",
		secure: env.NODE_ENV === "production",
		expires: request.expiresAt,
		path: "/",
	});
}

export async function deleteEmailVerificationRequestCookie(): Promise<void> {
	(await cookies()).set(emailVerificationRequestCookieName, "", {
		httpOnly: true,
		sameSite: "lax",
		secure: env.NODE_ENV === "production",
		maxAge: 0,
		path: "/",
	});
}

//

export async function createPasswordResetSession(
	token: string,
	userId: string,
	email: string,
): Promise<schema.PasswordResetSession> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	const session: schema.PasswordResetSession = {
		id: sessionId,
		userId,
		email,
		expiresAt: new Date(Date.now() + passwordResetSessionMaxDurationMs),
		code: generateRandomOTP(),
		isEmailVerified: false,
		isTwoFactorVerified: false,
	};

	await db.insert(schema.passwordResetSessions).values({
		id: session.id,
		userId: session.userId,
		email: session.email,
		code: session.code,
		expiresAt: session.expiresAt,
	});

	return session;
}

export async function validatePasswordResetSessionToken(
	token: string,
): Promise<PasswordResetSessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	const [row] = await db
		.select({ passwordResetSession: schema.passwordResetSessions, user: schema.users })
		.from(schema.passwordResetSessions)
		.innerJoin(schema.users, eq(schema.passwordResetSessions.userId, schema.users.id))
		.where(eq(schema.passwordResetSessions.id, sessionId));

	if (row == null) {
		return { session: null, user: null };
	}

	const session: schema.PasswordResetSession = {
		id: row.passwordResetSession.id,
		userId: row.passwordResetSession.userId,
		email: row.passwordResetSession.email,
		code: row.passwordResetSession.code,
		expiresAt: row.passwordResetSession.expiresAt,
		isEmailVerified: row.passwordResetSession.isEmailVerified,
		isTwoFactorVerified: row.passwordResetSession.isTwoFactorVerified,
	};

	const user: User = {
		id: row.user.id,
		email: row.user.email,
		username: row.user.username,
		role: row.user.role,
		isEmailVerified: row.user.isEmailVerified,
		isTwoFactorRegistered: row.user.totpKey != null,
	};

	if (Date.now() >= session.expiresAt.getTime()) {
		await db
			.delete(schema.passwordResetSessions)
			.where(eq(schema.passwordResetSessions.id, sessionId));

		return { session: null, user: null };
	}

	return { session, user };
}

export async function setPasswordResetSessionAsEmailVerified(sessionId: string): Promise<void> {
	await db
		.update(schema.passwordResetSessions)
		.set({ isEmailVerified: true })
		.where(eq(schema.passwordResetSessions.id, sessionId));
}

export async function setPasswordResetSessionAs2FAVerified(sessionId: string): Promise<void> {
	await db
		.update(schema.passwordResetSessions)
		.set({ isTwoFactorVerified: true })
		.where(eq(schema.passwordResetSessions.id, sessionId));
}

export async function invalidateUserPasswordResetSessions(userId: string): Promise<void> {
	await db
		.delete(schema.passwordResetSessions)
		.where(eq(schema.passwordResetSessions.userId, userId));
}

export async function validatePasswordResetSessionRequest(): Promise<PasswordResetSessionValidationResult> {
	const token = await getPasswordResetSessionToken();

	if (token == null) {
		return { session: null, user: null };
	}

	const result = await validatePasswordResetSessionToken(token);

	if (result.session == null) {
		await deletePasswordResetSessionTokenCookie();
	}

	return result;
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<void> {
	await sendEmail({
		from: env.EMAIL_ADDRESS,
		to: email,
		subject: "Reset code",
		text: `Your reset code is ${code}`,
	});
}

export type PasswordResetSessionValidationResult =
	| { session: schema.PasswordResetSession; user: User }
	| { session: null; user: null };

//

export async function getPasswordResetSessionToken(): Promise<string | null> {
	return (await cookies()).get(passwordResetCookieName)?.value ?? null;
}

export async function setPasswordResetSessionTokenCookie(
	token: string,
	expiresAt: Date,
): Promise<void> {
	(await cookies()).set(passwordResetCookieName, token, {
		httpOnly: true,
		sameSite: "lax",
		secure: env.NODE_ENV === "production",
		expires: expiresAt,
		path: "/",
	});
}

export async function deletePasswordResetSessionTokenCookie(): Promise<void> {
	(await cookies()).set(passwordResetCookieName, "", {
		httpOnly: true,
		sameSite: "lax",
		secure: env.NODE_ENV === "production",
		maxAge: 0,
		path: "/",
	});
}
