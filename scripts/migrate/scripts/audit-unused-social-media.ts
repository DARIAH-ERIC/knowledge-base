import * as fs from "node:fs/promises";
import * as path from "node:path";

import { log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { eq } from "drizzle-orm";

import { cacheFolderPath } from "../config/data-migration.config";
import { env } from "../config/env.config";

/**
 * Lists social-media rows that are not referenced by any database foreign key. Runs as a dry run by
 * default; pass `--apply` to delete them.
 *
 * @example
 * 	pnpm run data:audit:unused-social-media
 * 	pnpm run data:audit:unused-social-media -- --apply
 */

const reportFilePath = path.join(cacheFolderPath, "unused-social-media.tsv");

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

function toTsvCell(value: Date | string): string {
	return (typeof value === "string" ? value : value.toISOString())
		.replaceAll("\t", " ")
		.replaceAll(/\r?\n/g, " ");
}

async function main(): Promise<void> {
	const apply = process.argv.includes("--apply");

	log.info(
		apply
			? "Finding and removing unused social-media entries..."
			: "Finding unused social-media entries (dry run; pass `--apply` to remove them)...",
	);

	const [socialMedia, ...referenceGroups] = await Promise.all([
		db
			.select({
				id: schema.socialMedia.id,
				name: schema.socialMedia.name,
				type: schema.socialMediaTypes.type,
				url: schema.socialMedia.url,
				createdAt: schema.socialMedia.createdAt,
				updatedAt: schema.socialMedia.updatedAt,
			})
			.from(schema.socialMedia)
			.innerJoin(
				schema.socialMediaTypes,
				eq(schema.socialMediaTypes.id, schema.socialMedia.typeId),
			),
		db
			.select({ id: schema.projectsToSocialMedia.socialMediaId })
			.from(schema.projectsToSocialMedia),
		db
			.select({ id: schema.organisationalUnitsToSocialMedia.socialMediaId })
			.from(schema.organisationalUnitsToSocialMedia),
		db
			.select({ id: schema.servicesToSocialMedia.socialMediaId })
			.from(schema.servicesToSocialMedia),
		db
			.select({ id: schema.countryReportSocialMedia.socialMediaId })
			.from(schema.countryReportSocialMedia),
		db
			.select({ id: schema.countryReportSocialMediaKpis.socialMediaId })
			.from(schema.countryReportSocialMediaKpis),
		db
			.select({ id: schema.workingGroupReportSocialMedia.socialMediaId })
			.from(schema.workingGroupReportSocialMedia),
	]);

	const referencedIds = new Set(referenceGroups.flatMap((rows) => rows.map((row) => row.id)));
	const unusedSocialMedia = socialMedia
		.filter((item) => !referencedIds.has(item.id))
		.toSorted(
			(a, b) =>
				a.type.localeCompare(b.type) ||
				a.name.localeCompare(b.name) ||
				a.url.localeCompare(b.url) ||
				a.id.localeCompare(b.id),
		);

	const columns = ["id", "type", "name", "url", "created_at", "updated_at"] as const;
	const rows = unusedSocialMedia.map((item) =>
		[item.id, item.type, item.name, item.url, item.createdAt, item.updatedAt]
			.map((value) => toTsvCell(value))
			.join("\t"),
	);

	await fs.mkdir(cacheFolderPath, { recursive: true });
	await fs.writeFile(
		reportFilePath,
		`${columns.join("\t")}\n${rows.join("\n")}${rows.length > 0 ? "\n" : ""}`,
		{ encoding: "utf-8" },
	);

	if (!apply) {
		log.success(
			`Found ${String(unusedSocialMedia.length)} unused social-media entry/entries out of ${String(socialMedia.length)}. Report: ${reportFilePath}`,
		);
		return;
	}

	let deleted = 0;
	let failed = 0;

	for (const item of unusedSocialMedia) {
		try {
			await db.delete(schema.socialMedia).where(eq(schema.socialMedia.id, item.id));
			deleted++;
		} catch (error) {
			failed++;
			log.error(
				`Failed to remove social-media entry "${item.name}" (${item.id}): ${String(error)}`,
			);
		}
	}

	log.success(
		`Removed ${String(deleted)} unused social-media entry/entries; ${String(failed)} failed. Report: ${reportFilePath}`,
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
