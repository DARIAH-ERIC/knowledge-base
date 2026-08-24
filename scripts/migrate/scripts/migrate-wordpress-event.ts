import { assert, isNonEmptyString, keyBy, log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { createStorageService } from "@dariah-eric/storage";
import { and, eq } from "drizzle-orm";

import { apiBaseUrl, placeholderImageUrl } from "../config/data-migration.config";
import { env } from "../config/env.config";
import {
	type WordPressData,
	getEventBySlug,
	getEventDuration,
	getMediaById,
	parseWordPressGmt,
} from "../src/lib/get-wordpress-data";
import {
	createWordPressContentMigrator,
	normalizeWordPressSlug,
	readAssetsCacheData,
	toPlaintext,
	toSummary,
	writeAssetsCacheData,
} from "../src/lib/migrate-wordpress-content";

/**
 * The bulk `migrate-wordpress.ts` import already ran, but events keep being published on the
 * WordPress site. This script migrates individual, freshly-published events by their WordPress
 * slug
 *
 * - Fetching them live (the bulk cache is stale) and inserting them with the exact same
 *   entity/version/content shape as the bulk import. It is idempotent: a slug that already exists
 *   as an event entity is skipped.
 *
 * Usage: `pnpm run data:migrate:wordpress-event <slug> [<slug> ...]`
 */

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

const { upload, uploadFeaturedImage, migrateHtmlContent } = createWordPressContentMigrator(
	db,
	storage,
);

async function main() {
	const slugs = process.argv.slice(2).filter((slug) => slug.trim().length > 0);

	assert(
		slugs.length > 0,
		"Provide at least one WordPress event slug: pnpm run data:migrate:wordpress-event <slug> [<slug> ...]",
	);

	const status = await db.query.entityStatus.findMany();
	const statusByType = keyBy(status, (item) => item.type);

	const types = await db.query.entityTypes.findMany();
	const typesByType = keyBy(types, (item) => item.type);

	const contentBlockTypes = await db.query.contentBlockTypes.findMany();
	const contentBlockTypesByType = keyBy(contentBlockTypes, (item) => item.type);

	const assetsCache = await readAssetsCacheData();

	const placeholderImage = await upload("images", assetsCache, placeholderImageUrl, "Placeholder");
	assert(placeholderImage, "Missing placeholder image.");
	const placeholderImageId = placeholderImage.id;

	for (const slug of slugs) {
		log.info(`Migrating event "${slug}"...`);

		const event = await getEventBySlug(apiBaseUrl, slug);

		if (event == null) {
			log.warn(`No WordPress event found for slug "${slug}". Skipping.`);
			continue;
		}

		if (event.status !== "publish") {
			log.warn(`Event "${slug}" has not been published (status "${event.status}"). Skipping.`);
			continue;
		}

		if (!isNonEmptyString(event.utc_start_date)) {
			log.warn(`Event "${slug}" has no start date. Skipping.`);
			continue;
		}

		const entitySlug = normalizeWordPressSlug(event.slug, toPlaintext(event.title));

		const existing = await db
			.select({ id: schema.entities.id })
			.from(schema.entities)
			.where(
				and(
					eq(schema.entities.typeId, typesByType.events.id),
					eq(schema.entities.slug, entitySlug),
				),
			)
			.limit(1);

		if (existing.length > 0) {
			log.warn(`An event entity with slug "${entitySlug}" already exists. Skipping.`);
			continue;
		}

		let media: WordPressData["media"] = {};
		let featuredMediaId: number | undefined = event.image !== false ? event.image.id : undefined;

		if (featuredMediaId != null) {
			const attachment = await getMediaById(apiBaseUrl, featuredMediaId);
			if (attachment != null) {
				media = { [featuredMediaId]: attachment };
			} else {
				log.warn(`Missing featured image (event slug "${slug}").`);
				featuredMediaId = undefined;
			}
		}

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: entitySlug,
					typeId: typesByType.events.id,
					createdAt: parseWordPressGmt(event.date_utc),
					updatedAt: parseWordPressGmt(event.modified_utc),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const [version] = await tx
				.insert(schema.entityVersions)
				.values({
					entityId: entity.id,
					statusId: statusByType.published.id,
				})
				.returning({ id: schema.entityVersions.id });

			assert(version);

			const id = version.id;

			const imageId = await uploadFeaturedImage(
				"images",
				assetsCache,
				media,
				featuredMediaId,
				event.id,
			);

			await tx.insert(schema.events).values({
				id,
				title: toPlaintext(event.title),
				summary: toSummary(event.description),
				imageId: imageId ?? placeholderImageId,
				website: event.website,
				location:
					Array.isArray(event.venue) && event.venue.length === 0
						? ""
						: [event.venue.venue, event.venue.country].filter(isNonEmptyString).join(", "),
				duration: getEventDuration(event),
				isFullDay: event.all_day,
				createdAt: parseWordPressGmt(event.date_utc),
				updatedAt: parseWordPressGmt(event.modified_utc),
			});

			if (event.description.trim().length === 0) {
				return;
			}

			const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: typesByType.events.id,
					fieldName: "content",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityVersionId: version.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			await migrateHtmlContent(
				tx,
				event.description,
				assetsCache,
				field.id,
				contentBlockTypesByType,
			);
		});

		log.success(`Migrated event "${slug}" (entity slug "${entitySlug}").`);
	}

	await writeAssetsCacheData(assetsCache);
}

main()
	.catch((error: unknown) => {
		log.error("Failed to migrate event.", error);
		process.exitCode = 1;
	})
	// oxlint-disable-next-line typescript/no-misused-promises
	.finally(() =>
		// oxlint-disable-next-line typescript/strict-void-return
		db.$client.end().catch((error: unknown) => {
			log.error("Failed to close database connection.\n", error);
			process.exitCode = 1;
		}),
	);
