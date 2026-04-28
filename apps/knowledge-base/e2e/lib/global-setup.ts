import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { log } from "@acdh-oeaw/lib";
import { config as dotenv } from "@dotenvx/dotenvx";

dotenv({
	path: [".env.test.local", ".env.local", ".env.test", ".env"].map((filePath) => {
		return join(import.meta.dirname, "../..", filePath);
	}),
	ignore: ["MISSING_ENV_FILE"],
	quiet: true,
});

const E2E_ADMIN_EMAIL = "e2e-admin@example.com";
const E2E_ADMIN_NAME = "E2E Admin";
const E2E_TEST_ASSET_KEYS: Array<{ key: string; label: string }> = [
	{ key: "avatars/e2e-test-asset", label: "E2E Test Asset" },
	{ key: "images/e2e-test-asset", label: "E2E Test Asset" },
	{ key: "logos/e2e-test-asset", label: "E2E Test Asset" },
];
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

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

	const [{ eq }, { createDatabaseService }, schema] = await Promise.all([
		import("@dariah-eric/database/sql"),
		import("@dariah-eric/database"),
		import("@dariah-eric/database/schema"),
	]);

	const db = createDatabaseService({
		connection: {
			// eslint-disable-next-line no-restricted-syntax
			database: process.env.DATABASE_NAME,
			// eslint-disable-next-line no-restricted-syntax
			host: process.env.DATABASE_HOST,
			// eslint-disable-next-line no-restricted-syntax
			password: process.env.DATABASE_PASSWORD,
			// eslint-disable-next-line no-restricted-syntax
			port: Number(process.env.DATABASE_PORT),
			// eslint-disable-next-line no-restricted-syntax
			user: process.env.DATABASE_USER,
		},
		logger: false,
	}).unwrap();

	try {
		/**
		 * Upsert test admin user.
		 * The `passwordHash` is a placeholder — we bypass password auth in e2etests by injecting a
		 * pre-authenticated session directly into the database.
		 */
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

		for (const { key, label } of E2E_TEST_ASSET_KEYS) {
			const existingAsset = await db.query.assets.findFirst({
				where: { key },
				columns: { id: true },
			});

			if (existingAsset == null) {
				await db.insert(schema.assets).values({
					key,
					label,
					mimeType: "image/jpeg",
				});
			}
		}

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

		log.info(`[globalSetup] Admin session written for ${E2E_ADMIN_EMAIL}`);
	} finally {
		await db.$client.end();
	}
}
