import * as fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";

import { log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { createStorageService } from "@dariah-eric/storage";
import { eq } from "drizzle-orm";

import { cacheFolderPath } from "../config/data-migration.config";
import { env } from "../config/env.config";

/**
 * Lists asset rows that are not referenced by any database foreign key. Runs as a dry run by
 * default; pass `--apply` to delete the unused rows and their storage objects. Add `--backup` to
 * download each object to the local cache before deleting it.
 *
 * @example
 * 	pnpm run data:audit:unused-assets -- --apply
 * 	pnpm run data:audit:unused-assets -- --apply --backup
 */

const reportFilePath = path.join(cacheFolderPath, "unused-assets.tsv");
const backupFolderPath = path.join(cacheFolderPath, "unused-assets");

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

function toTsvCell(value: number | string | null): string {
	if (value == null) {
		return "";
	}

	return String(value).replaceAll("\t", " ").replaceAll(/\r?\n/g, " ");
}

async function backupAsset(key: string): Promise<void> {
	const filePath = path.resolve(backupFolderPath, key);
	const relativeFilePath = path.relative(backupFolderPath, filePath);

	if (relativeFilePath.startsWith("..") || path.isAbsolute(relativeFilePath)) {
		throw new Error(`Cannot back up asset with unsafe key: "${key}"`);
	}

	await fs.mkdir(path.dirname(filePath), { recursive: true });

	const temporaryFilePath = `${filePath}.tmp-${String(process.pid)}`;
	try {
		const input = (await storage.download(key)).unwrap();
		await pipeline(input, createWriteStream(temporaryFilePath));
		await fs.rename(temporaryFilePath, filePath);
	} catch (error) {
		await fs.rm(temporaryFilePath, { force: true });
		throw error;
	}
}

async function main() {
	const apply = process.argv.includes("--apply");
	const backup = process.argv.includes("--backup");

	if (backup && !apply) {
		throw new Error("`--backup` requires `--apply`.");
	}

	log.info(
		apply
			? `Finding and removing unused assets${backup ? ` (backing up to ${backupFolderPath})` : ""}...`
			: "Finding unused assets (dry run; pass `--apply` to remove them)...",
	);

	const [assets, ...referenceGroups] = await Promise.all([
		db.select().from(schema.assets),
		db
			.select({ id: schema.galleryContentBlockItems.imageId })
			.from(schema.galleryContentBlockItems),
		db.select({ id: schema.imageContentBlocks.imageId }).from(schema.imageContentBlocks),
		db.select({ id: schema.heroContentBlocks.imageId }).from(schema.heroContentBlocks),
		db.select({ id: schema.documentsPolicies.documentId }).from(schema.documentsPolicies),
		db.select({ id: schema.impactCaseStudies.imageId }).from(schema.impactCaseStudies),
		db.select({ id: schema.externalLinks.imageId }).from(schema.externalLinks),
		db.select({ id: schema.projects.imageId }).from(schema.projects),
		db.select({ id: schema.organisationalUnits.imageId }).from(schema.organisationalUnits),
		db.select({ id: schema.news.imageId }).from(schema.news),
		db.select({ id: schema.spotlightArticles.imageId }).from(schema.spotlightArticles),
		db.select({ id: schema.events.imageId }).from(schema.events),
		db.select({ id: schema.persons.imageId }).from(schema.persons),
		db.select({ id: schema.pages.imageId }).from(schema.pages),
		db.select({ id: schema.siteMetadata.ogImageId }).from(schema.siteMetadata),
	]);

	const referencedAssetIds = new Set(
		referenceGroups.flatMap((rows) => rows.map((row) => row.id).filter((id) => id != null)),
	);
	const unusedAssets = assets
		.filter((asset) => !referencedAssetIds.has(asset.id))
		.toSorted((a, b) => a.key.localeCompare(b.key) || a.id.localeCompare(b.id));

	const columns = [
		"id",
		"key",
		"label",
		"filename",
		"mime_type",
		"size",
		"created_at",
		"updated_at",
	] as const;
	const rows = unusedAssets.map((asset) =>
		[
			asset.id,
			asset.key,
			asset.label,
			asset.filename,
			asset.mimeType,
			asset.size,
			asset.createdAt.toISOString(),
			asset.updatedAt.toISOString(),
		]
			.map((value) => toTsvCell(value))
			.join("\t"),
	);

	await fs.mkdir(cacheFolderPath, { recursive: true });
	await fs.writeFile(
		reportFilePath,
		`${columns.join("\t")}\n${rows.join("\n")}${rows.length > 0 ? "\n" : ""}`,
		{ encoding: "utf-8" },
	);

	log.success(
		`Found ${String(unusedAssets.length)} unused asset(s) out of ${String(assets.length)}. Report: ${reportFilePath}`,
	);

	if (!apply) {
		return;
	}

	let deleted = 0;
	let failed = 0;
	let backedUp = 0;

	for (const asset of unusedAssets) {
		try {
			if (backup) {
				await backupAsset(asset.key);
				backedUp++;
			}

			await db.transaction(async (tx) => {
				/** The delete is protected by foreign keys if the asset became referenced after the audit. */
				await tx.delete(schema.assets).where(eq(schema.assets.id, asset.id));
				(await storage.delete(asset.key)).unwrap();
			});
			deleted++;
		} catch (error) {
			failed++;
			log.error(
				`Failed to ${backup ? "back up or remove" : "remove"} asset "${asset.key}" (${asset.id}): ${String(error)}`,
			);
		}
	}

	log.info(
		`Done. Removed ${String(deleted)} unused asset(s); ${String(failed)} failed.${
			backup ? ` Backed up ${String(backedUp)} object(s) to ${backupFolderPath}.` : ""
		} Report: ${reportFilePath}`,
	);

	if (failed > 0) {
		process.exitCode = 1;
	}
}

try {
	await main();
} catch (error) {
	log.error(error);
	process.exitCode = 1;
} finally {
	await db.$client.end().catch((error: unknown) => {
		log.error(error);
		process.exitCode = 1;
	});
}
