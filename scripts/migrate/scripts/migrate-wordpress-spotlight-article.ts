import { assert, keyBy, log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { createStorageService } from "@dariah-eric/storage";
import { and, eq } from "drizzle-orm";
import type { WP_REST_API_Page } from "wp-types";

import { apiBaseUrl, placeholderImageUrl } from "../config/data-migration.config";
import { env } from "../config/env.config";
import { documentIdOf } from "../src/lib/entity-versions";
import {
	type WordPressData,
	getMediaById,
	getPageBySlug,
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
import { createPersonResolver } from "../src/lib/persons";
import { extractAuthorsFromHtml } from "../src/lib/wordpress-authors";
import {
	type ListPageImageReference,
	extractListPageImageReferences,
	uploadListPageImage,
} from "../src/lib/wordpress-list-page-images";

/**
 * The bulk `migrate-wordpress.ts` import already ran, but spotlight articles keep being published
 * on the WordPress site. This script migrates individual, freshly-published spotlight articles by
 * their WordPress slug — fetching them live (the bulk cache is stale) and inserting them with the
 * exact same entity/version/content shape as the bulk import. It is idempotent: a slug that already
 * exists as a spotlight article entity is skipped.
 *
 * Spotlight articles are WordPress _pages_ below `/activities/spotlight/`, not posts, and carry
 * neither a featured image nor an author field of their own:
 *
 * - The image an article is known by only lives in the markup of the spotlight list page, which is
 *   fetched alongside the article and scraped for the figure linking to it. The article's own
 *   featured image is the fallback, the placeholder the last resort.
 * - The byline is part of the article body ("Written by …"), so authors are read back out of the
 *   content and linked as `author` contributor relations, creating person entities for names the
 *   knowledge base does not know yet.
 *
 * Usage: `pnpm run data:migrate:wordpress-spotlight-article <slug> [<slug> ...]`
 */

/** Spotlight articles live below this path; anything else is a website page or a case study. */
const spotlightPathPrefix = "/activities/spotlight/";

/** The WordPress page whose markup carries the image each spotlight article is known by. */
const spotlightListPageSlug = "spotlight";

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

function isSpotlightArticle(page: WP_REST_API_Page): boolean {
	try {
		return new URL(page.link).pathname.startsWith(spotlightPathPrefix);
	} catch {
		return false;
	}
}

async function getListPageImages(): Promise<Map<string, ListPageImageReference>> {
	const listPage = await getPageBySlug(apiBaseUrl, spotlightListPageSlug);

	if (listPage == null) {
		log.warn("No spotlight list page found. Falling back to featured images.");
		return new Map();
	}

	return extractListPageImageReferences(listPage.content.rendered, spotlightPathPrefix);
}

async function main() {
	const slugs = process.argv.slice(2).filter((slug) => slug.trim().length > 0);

	assert(
		slugs.length > 0,
		"Provide at least one WordPress spotlight article slug: pnpm run data:migrate:wordpress-spotlight-article <slug> [<slug> ...]",
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

	const { ensurePersonByName } = await createPersonResolver(db, {
		personEntityTypeId: typesByType.persons.id,
		publishedStatusId: statusByType.published.id,
		placeholderImageId,
	});

	const listPageImages = await getListPageImages();

	for (const slug of slugs) {
		log.info(`Migrating spotlight article "${slug}"...`);

		const page = await getPageBySlug(apiBaseUrl, slug);

		if (page == null) {
			log.warn(`No WordPress page found for slug "${slug}". Skipping.`);
			continue;
		}

		if (page.status !== "publish") {
			log.warn(
				`Spotlight article "${slug}" has not been published (status "${page.status}"). Skipping.`,
			);
			continue;
		}

		if (!isSpotlightArticle(page)) {
			log.warn(`Page "${slug}" is not a spotlight article (link "${page.link}"). Skipping.`);
			continue;
		}

		const entitySlug = normalizeWordPressSlug(page.slug, toPlaintext(page.title.rendered));

		const existing = await db
			.select({ id: schema.entities.id })
			.from(schema.entities)
			.where(
				and(
					eq(schema.entities.typeId, typesByType.spotlight_articles.id),
					eq(schema.entities.slug, entitySlug),
				),
			)
			.limit(1);

		if (existing.length > 0) {
			log.warn(`A spotlight article entity with slug "${entitySlug}" already exists. Skipping.`);
			continue;
		}

		const listPageImage = listPageImages.get(page.slug);

		const media: WordPressData["media"] = {};
		let featuredMediaId: number | undefined =
			page.featured_media !== 0 ? page.featured_media : undefined;

		for (const mediaId of new Set([listPageImage?.mediaId, featuredMediaId])) {
			if (mediaId == null) {
				continue;
			}

			const attachment = await getMediaById(apiBaseUrl, mediaId);

			if (attachment != null) {
				media[mediaId] = attachment;
			} else if (mediaId === featuredMediaId) {
				log.warn(`Missing featured image (spotlight article slug "${slug}").`);
				featuredMediaId = undefined;
			}
		}

		const articleId = await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: entitySlug,
					typeId: typesByType.spotlight_articles.id,
					createdAt: parseWordPressGmt(page.date_gmt),
					updatedAt: parseWordPressGmt(page.modified_gmt),
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

			let imageId: string | null = null;

			if (listPageImage != null) {
				try {
					imageId = await uploadListPageImage(upload, "images", assetsCache, media, listPageImage);
				} catch {
					log.warn(`Failed to migrate list page image (spotlight article slug "${slug}").`);
				}
			}

			imageId ??= await uploadFeaturedImage("images", assetsCache, media, featuredMediaId, page.id);

			if (imageId == null) {
				log.warn(`Missing image (spotlight article slug "${slug}").`);
			}

			await tx.insert(schema.spotlightArticles).values({
				id,
				title: toPlaintext(page.title.rendered),
				summary: toSummary(page.excerpt.rendered),
				imageId: imageId ?? placeholderImageId,
				publicationDate: parseWordPressGmt(page.date_gmt),
				createdAt: parseWordPressGmt(page.date_gmt),
				updatedAt: parseWordPressGmt(page.modified_gmt),
			});

			if (page.content.rendered.trim().length === 0) {
				return id;
			}

			const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: typesByType.spotlight_articles.id,
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
				page.content.rendered,
				assetsCache,
				field.id,
				contentBlockTypesByType,
			);

			return id;
		});

		/**
		 * Contributors are written after the article's transaction has committed, because a person
		 * created for an unknown author is created in a transaction of its own — the same order the
		 * bulk import writes them in.
		 */
		const authorNames = extractAuthorsFromHtml(page.content.rendered);

		if (authorNames.length === 0) {
			log.warn(
				`No authors parsed for "${slug}". A corporate byline ("By WG members of DHwiki") names no person to link — add contributors by hand if the article needs them.`,
			);
		}

		for (const authorName of authorNames) {
			const personId = await ensurePersonByName(authorName);

			await db
				.insert(schema.spotlightArticlesToPersons)
				.values({
					spotlightArticleDocumentId: await documentIdOf(db, articleId),
					personDocumentId: await documentIdOf(db, personId),
					role: "author",
				})
				.onConflictDoNothing();
		}

		log.success(`Migrated spotlight article "${slug}" (entity slug "${entitySlug}").`);
	}

	await writeAssetsCacheData(assetsCache);
}

main()
	.catch((error: unknown) => {
		log.error("Failed to migrate spotlight article.", error);
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
