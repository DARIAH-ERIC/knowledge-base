import { setTimeout as sleep } from "node:timers/promises";

import { log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { eq, isNull } from "@dariah-eric/database/sql";
import { createStorageService } from "@dariah-eric/storage";
import { getContentHash } from "@dariah-eric/storage/lib";

import { env } from "../config/env.config";

/** Backfills `assets.content_hash` for all assets. Dry-run by default; pass `--apply` to persist. */

/**
 * Objects are downloaded in parallel; one at a time is needlessly slow for a few thousand assets.
 * Pass `--concurrency=<n>` to lower it when the storage endpoint drops connections under load.
 */
const concurrency = getConcurrency() ?? 8;

/** Dropped connections (`socket hang up`, `ECONNRESET`) are transient, so a download is retried. */
const maxAttempts = 3;

function getConcurrency(): number | undefined {
	const arg = process.argv.find((arg) => arg.startsWith("--concurrency="));
	if (arg == null) {
		return undefined;
	}
	const value = Number(arg.slice("--concurrency=".length));
	if (!Number.isInteger(value) || value < 1) {
		throw new Error(`Invalid \`${arg}\`, expected a positive integer.`);
	}
	return value;
}

const db = createDatabaseService({
	connection: {
		database: env.DATABASE_NAME,
		host: env.DATABASE_HOST,
		password: env.DATABASE_PASSWORD,
		port: env.DATABASE_PORT,
		user: env.DATABASE_USER,
	},
	logger: false,
}).unwrap();

const storage = createStorageService({
	config: {
		accessKey: env.S3_ACCESS_KEY,
		bucketName: env.S3_BUCKET_NAME,
		endPoint: env.S3_HOST,
		port: env.S3_PORT,
		secretKey: env.S3_SECRET_KEY,
		useSSL: env.S3_PROTOCOL === "https",
	},
});

async function download(key: string): Promise<Buffer> {
	const result = await storage.download(key);
	/** `unwrap()` would panic with only the error tag; rethrow the cause so the warning says why. */
	if (result.isErr()) {
		const { cause } = result.error;
		throw Error.isError(cause) ? cause : result.error;
	}
	const stream = result.value;
	const chunks: Array<Buffer> = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBufferLike));
	}
	return Buffer.concat(chunks);
}

/** A missing object will not appear on retry, so only other failures are retried. */
function isMissingObject(error: unknown): boolean {
	const code = (error as { code?: unknown } | null)?.code;
	return code === "NoSuchKey" || code === "NotFound";
}

async function downloadWithRetry(key: string): Promise<Buffer> {
	for (let attempt = 1; ; attempt++) {
		try {
			return await download(key);
		} catch (error) {
			if (attempt >= maxAttempts || isMissingObject(error)) {
				throw error;
			}
			await sleep(1000 * attempt);
		}
	}
}

async function main(): Promise<void> {
	const apply = process.argv.includes("--apply");
	const assets = await db
		.select({ id: schema.assets.id, key: schema.assets.key })
		.from(schema.assets)
		.where(isNull(schema.assets.contentHash))
		.orderBy(schema.assets.key);

	log.info(`Hashing ${String(assets.length)} assets…`);

	let hashed = 0;
	let failed = 0;
	let next = 0;

	async function worker(): Promise<void> {
		while (next < assets.length) {
			const asset = assets[next++]!;

			let contentHash: string;
			try {
				contentHash = getContentHash(await downloadWithRetry(asset.key));
			} catch (error) {
				log.warn(`Cannot hash \`${asset.key}\`: ${String(error)}`);
				failed += 1;
				continue;
			}

			log.info(`  ${asset.key}: ${contentHash}`);
			if (apply) {
				await db.update(schema.assets).set({ contentHash }).where(eq(schema.assets.id, asset.id));
			}
			hashed += 1;
		}
	}

	await Promise.all(Array.from({ length: Math.min(concurrency, assets.length) }, worker));

	log.info(`${apply ? "Updated" : "Would update"} ${String(hashed)} asset content hashes.`);
	if (failed > 0) {
		log.warn(`${String(failed)} assets could not be hashed.`);
	}
}

await main();
