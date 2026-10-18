import { randomBytes, randomUUID } from "node:crypto";

import type { Database } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { describe, expect, it } from "vitest";

import { type Transaction, db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { withTransaction } from "@/test/lib/with-transaction";

const { createAuthService } = await import("@dariah-eric/auth");

const invitationDurationMs = 1000 * 60 * 60;

/** Invitations are pure database state, so cookies and email are inert stubs. */
function createTestAuthService(tx: Transaction, durationMs = invitationDurationMs) {
	const cookie = {
		name: "session",
		options: { httpOnly: true, sameSite: "lax", secure: false, path: "/" },
		durationMs: 1000 * 60 * 60,
	} as const;

	return createAuthService({
		config: {
			emailAddress: "noreply@example.com",
			passwords: { length: { min: 8, max: 255 } },
			emailVerificationRequests: { cookie },
			passwordResetSessions: { cookie },
			invitations: { durationMs },
			sessions: { cookie, impersonation: { durationMs: 1000 * 60 * 30 } },
		},
		context: {
			cookies: {
				get: () => Promise.resolve(null),
				set: () => Promise.resolve(),
				delete: () => Promise.resolve(),
			},
			// The suite runs inside a rolled-back transaction, so the service must write through it.
			db: tx as unknown as Database,
			email: { sendEmail: () => Promise.resolve() } as never,
		},
		secrets: { encryptionKey: randomBytes(16) },
	});
}

function createEmail(): string {
	return `${randomUUID()}@example.com`;
}

describe("invitations", () => {
	it("creates invited users without a password", async () => {
		await withTransaction(async (tx) => {
			const auth = createTestAuthService(tx);
			const user = await auth.createInvitedUser(createEmail(), "Invitee", tx);

			expect(await auth.getUserPasswordHash(user.id)).toBeNull();
			expect(user.isEmailVerified).toBe(false);
		});
	});

	it("sets the password and verifies the email when accepted, once", async () => {
		await withTransaction(async (tx) => {
			const auth = createTestAuthService(tx);
			const email = createEmail();
			const user = await auth.createInvitedUser(email, "Invitee", tx);
			const { token } = await auth.createUserInvitation(user.id, email, tx);

			const invitation = await auth.getUserInvitation(token);
			expect(invitation?.user).toEqual({ id: user.id, email, name: "Invitee" });

			const accepted = await auth.acceptUserInvitation(token, "correct horse battery staple");
			expect(accepted?.id).toBe(user.id);

			const passwordHash = await auth.getUserPasswordHash(user.id);
			expect(passwordHash).not.toBeNull();
			expect(await auth.verifyPasswordHash(passwordHash!, "correct horse battery staple")).toBe(
				true,
			);
			expect((await auth.getUserById(user.id))?.isEmailVerified).toBe(true);

			expect(await auth.getUserInvitation(token)).toBeNull();
			expect(await auth.acceptUserInvitation(token, "another password")).toBeNull();
		});
	});

	it("rejects unknown tokens without touching any account", async () => {
		await withTransaction(async (tx) => {
			const auth = createTestAuthService(tx);
			const email = createEmail();
			const user = await auth.createInvitedUser(email, "Invitee", tx);
			await auth.createUserInvitation(user.id, email, tx);

			const unknownToken = randomBytes(32).toString("hex");

			expect(await auth.getUserInvitation(unknownToken)).toBeNull();
			expect(
				await auth.acceptUserInvitation(unknownToken, "correct horse battery staple"),
			).toBeNull();
			expect(await auth.getUserPasswordHash(user.id)).toBeNull();
			expect((await auth.getUserById(user.id))?.isEmailVerified).toBe(false);
		});
	});

	it("does not accept the stored hash in place of the token", async () => {
		await withTransaction(async (tx) => {
			const auth = createTestAuthService(tx);
			const email = createEmail();
			const user = await auth.createInvitedUser(email, "Invitee", tx);
			await auth.createUserInvitation(user.id, email, tx);

			const [row] = await tx
				.select({ id: schema.userInvitations.id })
				.from(schema.userInvitations)
				.where(eq(schema.userInvitations.userId, user.id));

			expect(await auth.getUserInvitation(row!.id)).toBeNull();
		});
	});

	it("only stores a hash of the token", async () => {
		await withTransaction(async (tx) => {
			const auth = createTestAuthService(tx);
			const email = createEmail();
			const user = await auth.createInvitedUser(email, "Invitee", tx);
			const { token } = await auth.createUserInvitation(user.id, email, tx);

			const rows = await tx
				.select({ id: schema.userInvitations.id })
				.from(schema.userInvitations)
				.where(eq(schema.userInvitations.userId, user.id));

			expect(rows).toHaveLength(1);
			expect(rows[0]?.id).not.toBe(token);
		});
	});

	it("invalidates the previous link when a new invitation is sent", async () => {
		await withTransaction(async (tx) => {
			const auth = createTestAuthService(tx);
			const email = createEmail();
			const user = await auth.createInvitedUser(email, "Invitee", tx);
			const first = await auth.createUserInvitation(user.id, email, tx);
			const second = await auth.createUserInvitation(user.id, email, tx);

			expect(await auth.getUserInvitation(first.token)).toBeNull();
			expect(await auth.getUserInvitation(second.token)).not.toBeNull();
		});
	});

	/**
	 * Needs real concurrency, so unlike the rest of the suite this commits to the database (and
	 * cleans up after itself). Each replacement holds its transaction open for a moment, as the
	 * resend action does while it sends the email, so that the transactions reliably overlap.
	 */
	it("keeps a single valid link when invitations are replaced concurrently", async () => {
		const auth = createTestAuthService(db as unknown as Transaction);
		const email = createEmail();
		const user = await auth.createInvitedUser(email, "Invitee");

		try {
			const tokens = await Promise.all(
				Array.from({ length: 3 }, () =>
					db.transaction(async (tx) => {
						const { token } = await auth.createUserInvitation(user.id, email, tx);
						await new Promise((resolve) => {
							setTimeout(resolve, 100);
						});
						return token;
					}),
				),
			);

			const rows = await db
				.select({ id: schema.userInvitations.id })
				.from(schema.userInvitations)
				.where(eq(schema.userInvitations.userId, user.id));
			expect(rows).toHaveLength(1);

			const valid = await Promise.all(tokens.map((token) => auth.getUserInvitation(token)));
			expect(valid.filter((invitation) => invitation != null)).toHaveLength(1);
		} finally {
			await db.delete(schema.users).where(eq(schema.users.id, user.id));
		}
	});

	it("rejects expired invitations", async () => {
		await withTransaction(async (tx) => {
			const auth = createTestAuthService(tx, 0);
			const email = createEmail();
			const user = await auth.createInvitedUser(email, "Invitee", tx);
			const { token } = await auth.createUserInvitation(user.id, email, tx);

			expect(await auth.getUserInvitation(token)).toBeNull();
			expect(await auth.acceptUserInvitation(token, "correct horse battery staple")).toBeNull();
			expect(await auth.getUserPasswordHash(user.id)).toBeNull();
		});
	});

	it("rejects an invitation once the account's email has changed", async () => {
		await withTransaction(async (tx) => {
			const auth = createTestAuthService(tx);
			const email = createEmail();
			const user = await auth.createInvitedUser(email, "Invitee", tx);
			const { token } = await auth.createUserInvitation(user.id, email, tx);

			await tx
				.update(schema.users)
				.set({ email: createEmail() })
				.where(eq(schema.users.id, user.id));

			expect(await auth.getUserInvitation(token)).toBeNull();
		});
	});

	it("rejects an invitation once the account has a password", async () => {
		await withTransaction(async (tx) => {
			const auth = createTestAuthService(tx);
			const email = createEmail();
			const user = await auth.createInvitedUser(email, "Invitee", tx);
			const { token } = await auth.createUserInvitation(user.id, email, tx);

			// E.g. the invitee used "forgot password" instead of the invitation link.
			await auth.updatePassword(user.id, "correct horse battery staple");

			expect(await auth.getUserInvitation(token)).toBeNull();
		});
	});
});
