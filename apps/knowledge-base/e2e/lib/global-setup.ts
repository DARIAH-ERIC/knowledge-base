import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { config as dotenv } from "@dotenvx/dotenvx";

/**
 * Load env files at module-init time — BEFORE globalSetup() is called and
 * before any env-dependent modules are imported.
 *
 * We only statically import modules that have no env-validation side effects
 * (node builtins, dotenvx). Everything DB-related is dynamically imported
 * INSIDE globalSetup() after env vars are set.
 */
dotenv({
	path: [".env.test.local", ".env.local", ".env.test", ".env"].map((filePath) => {
		return join(import.meta.dirname, "../..", filePath);
	}),
	ignore: ["MISSING_ENV_FILE"],
	quiet: true,
});

const E2E_ADMIN_EMAIL = "e2e-admin@example.com";
const E2E_ADMIN_NAME = "E2E Admin";
const E2E_TEST_ASSET_KEY = "e2e-test-asset";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function encrypt(data: Buffer, key: Buffer): Buffer {
	const iv = randomBytes(16);
	const cipher = createCipheriv("aes-128-gcm", key, iv);
	return Buffer.concat([iv, cipher.update(data), cipher.final(), cipher.getAuthTag()]);
}

function hashSessionSecret(secret: string): Buffer {
	return createHash("sha-256").update(secret).digest();
}

// eslint-disable-next-line import-x/no-default-export
export default async function globalSetup(): Promise<void> {
	// eslint-disable-next-line no-restricted-syntax
	const authEncryptionKeyHex = process.env.AUTH_ENCRYPTION_KEY;
	if (authEncryptionKeyHex?.length !== 32) {
		throw new Error("AUTH_ENCRYPTION_KEY must be a 32-character hex string (16 bytes)");
	}
	const encryptionKey = Buffer.from(authEncryptionKeyHex, "hex");

	// Dynamic imports so that env validation in @dariah-eric/database/client
	// runs AFTER dotenv() has populated process.env above.
	const [{ eq }, { createClient }, schema] = await Promise.all([
		import("@dariah-eric/database"),
		import("@dariah-eric/database/client"),
		import("@dariah-eric/database/schema"),
	]);

	const db = createClient();

	try {
		// 1. Create/upsert test admin user.
		// The passwordHash is a placeholder — we bypass password auth in E2E tests
		// by injecting a pre-authenticated session directly into the database.
		const passwordHash = `e2e-placeholder-${randomBytes(16).toString("hex")}`;
		const twoFactorTotpKey = encrypt(randomBytes(20), encryptionKey);
		const twoFactorRecoveryCode = encrypt(
			Buffer.from("E2ETESTRECOVERYCODE1", "utf-8"),
			encryptionKey,
		);

		let existingUser = await db.query.users.findFirst({
			where: { email: E2E_ADMIN_EMAIL },
			columns: { id: true },
		});

		if (existingUser == null) {
			const [inserted] = await db
				.insert(schema.users)
				.values({
					email: E2E_ADMIN_EMAIL,
					name: E2E_ADMIN_NAME,
					passwordHash,
					role: "admin",
					isEmailVerified: true,
					twoFactorTotpKey,
					twoFactorRecoveryCode,
				})
				.returning({ id: schema.users.id });
			existingUser = inserted;
		} else {
			await db
				.update(schema.users)
				.set({ role: "admin", isEmailVerified: true, twoFactorTotpKey })
				.where(eq(schema.users.id, existingUser.id));
		}

		if (existingUser == null) {
			throw new Error("Failed to create or find the test admin user");
		}

		const userId = existingUser.id;

		// 2. Upsert the test asset (no licenseId needed).
		const existingAsset = await db.query.assets.findFirst({
			where: { key: E2E_TEST_ASSET_KEY },
			columns: { id: true },
		});

		if (existingAsset == null) {
			await db.insert(schema.assets).values({ key: E2E_TEST_ASSET_KEY });
		}

		// 3. Replace existing sessions with a new pre-authenticated session.
		await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));

		const sessionId = randomBytes(32).toString("hex");
		const sessionSecret = randomBytes(32).toString("hex");
		const sessionSecretHash = hashSessionSecret(sessionSecret);
		const sessionToken = `${sessionId}.${sessionSecret}`;
		const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);

		await db.insert(schema.sessions).values({
			id: sessionId,
			secretHash: sessionSecretHash,
			userId,
			expiresAt: sessionExpiresAt,
			isTwoFactorVerified: true,
		});

		// 4. Write Playwright storageState to e2e/.auth/admin.json.
		const baseUrl =
			// eslint-disable-next-line no-restricted-syntax
			process.env.NEXT_PUBLIC_APP_BASE_URL ?? `http://localhost:${process.env.PORT ?? "3001"}`;
		const url = new URL(baseUrl);

		const storageState = {
			cookies: [
				{
					name: "session",
					value: sessionToken,
					domain: url.hostname,
					path: "/",
					expires: Math.floor(sessionExpiresAt.getTime() / 1000),
					httpOnly: true,
					secure: url.protocol === "https:",
					sameSite: "Lax" as const,
				},
			],
			origins: [] as Array<never>,
		};

		const authDir = join(import.meta.dirname, "../.auth");
		await mkdir(authDir, { recursive: true });
		await writeFile(join(authDir, "admin.json"), JSON.stringify(storageState, null, 2), "utf-8");

		console.log(`[globalSetup] Admin session written for ${E2E_ADMIN_EMAIL}`);
	} finally {
		// Close the underlying pg pool so Node.js can exit cleanly.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		await (db as any).$client?.end?.();
	}
}
