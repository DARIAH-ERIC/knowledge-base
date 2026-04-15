import { createCipheriv, randomBytes } from "node:crypto";

import { log } from "@acdh-oeaw/lib";
import { hash } from "@node-rs/argon2";
import { encodeBase32UpperCaseNoPadding } from "@oslojs/encoding";
import { createTOTPKeyURI } from "@oslojs/otp";

// eslint-disable-next-line no-restricted-syntax
const authEncryptionKeyHex = process.env.AUTH_ENCRYPTION_KEY;
if (authEncryptionKeyHex?.length !== 32) {
	throw new Error("AUTH_ENCRYPTION_KEY must be a 32-character hex string (16 bytes)");
}
const encryptionKey = Buffer.from(authEncryptionKeyHex, "hex");

function encrypt(data: Buffer): Buffer {
	const iv = randomBytes(16);
	const cipher = createCipheriv("aes-128-gcm", encryptionKey, iv);
	return Buffer.concat([iv, cipher.update(data), cipher.final(), cipher.getAuthTag()]);
}

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
	const index = args.indexOf(flag);
	return index !== -1 ? args[index + 1] : undefined;
}

const email = getArg("--email") ?? "admin@example.com";
const name = getArg("--name") ?? "Admin";
const password = getArg("--password") ?? "Admin1234!";

async function main() {
	const { eq } = await import("@dariah-eric/database");
	const { createClient } = await import("@dariah-eric/database/client");
	const schema = await import("@dariah-eric/database/schema");

	const db = createClient();

	try {
		const passwordHash = await hash(password, {
			memoryCost: 19_456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1,
		});

		const totpKeyBytes = randomBytes(20);
		const totpKeyUri = createTOTPKeyURI("DARIAH Knowledge Base", email, totpKeyBytes, 30, 6);
		const totpKeyBase32 = encodeBase32UpperCaseNoPadding(totpKeyBytes);
		const twoFactorTotpKey = encrypt(totpKeyBytes);

		const recoveryCodePlain = encodeBase32UpperCaseNoPadding(randomBytes(10));
		const twoFactorRecoveryCode = encrypt(Buffer.from(recoveryCodePlain, "utf-8"));

		let existingUser = await db.query.users.findFirst({
			where: { email },
			columns: { id: true },
		});

		if (existingUser == null) {
			const [inserted] = await db
				.insert(schema.users)
				.values({
					email,
					name,
					passwordHash,
					role: "admin",
					isEmailVerified: true,
					twoFactorTotpKey,
					twoFactorRecoveryCode,
				})
				.returning({ id: schema.users.id });
			existingUser = inserted;
			log.success(`Created admin user: ${email}`);
		} else {
			await db
				.update(schema.users)
				.set({ name, passwordHash, role: "admin", isEmailVerified: true, twoFactorTotpKey })
				.where(eq(schema.users.id, existingUser.id));
			log.success(`Updated existing user as admin: ${email}`);
		}

		log.info("─────────────────────────────────────────");
		log.info(`Email:         ${email}`);
		log.info(`Password:      ${password}`);
		log.info(`TOTP secret:   ${totpKeyBase32}`);
		log.info(`TOTP URI:      ${totpKeyUri}`);
		log.info(`Recovery code: ${recoveryCodePlain}`);
		log.info("─────────────────────────────────────────");
		log.info("Scan the TOTP URI with an authenticator app, or enter the secret manually.");
		log.info("Save the recovery code in a safe place.");
	} finally {
		await db.$client.end();
	}
}

main().catch((error: unknown) => {
	log.error("Failed to create admin user.\n", error);
	process.exitCode = 1;
});
