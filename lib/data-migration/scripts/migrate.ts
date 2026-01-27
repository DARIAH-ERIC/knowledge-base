import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { assert, isNonEmptyString, keyBy, log } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { client } from "@dariah-eric/dariah-knowledge-base-object-store/client";
import { buffer } from "@dariah-eric/dariah-knowledge-base-object-store/lib";

import {
	apiBaseUrl,
	assetsCacheFilePath,
	assetsCacheFolderPath,
	cacheFilePath,
	cacheFolderPath,
	placeholderImageUrl,
} from "../config/data-migration.config";
import { getWordPressData, type WordPressData } from "../src/lib/get-wordpress-data";

type AssetsCache = Map<string, string>;

async function readCached(assetsCache: AssetsCache, url: URL) {
	const cacheKey = String(url);

	if (assetsCache.has(cacheKey)) {
		const filePath = path.join(assetsCacheFolderPath, assetsCache.get(cacheKey)!);
		const input = await buffer.fromFilePath(filePath);
		const metadata = await buffer.getMetadata(input);

		return { input, metadata };
	}

	const input = await buffer.fromUrl(url);
	const metadata = await buffer.getMetadata(input);

	const outputFilePath = path.join(assetsCacheFolderPath, `${randomUUID()}.${metadata.format}`);
	await fs.writeFile(outputFilePath, input);
	assetsCache.set(cacheKey, path.relative(assetsCacheFolderPath, outputFilePath));
	await writeAssetsCacheData(assetsCache);

	return { input, metadata };
}

async function upload(assetsCache: AssetsCache, url: URL) {
	const { input, metadata } = await readCached(assetsCache, url);

	const { key } = await client.images.upload({ prefix: "images", input, metadata });

	const [asset] = await db
		.insert(schema.assets)
		.values({
			key,
		})
		.returning({ id: schema.assets.id });

	return asset;
}

async function uploadFeaturedImage(
	assetsCache: AssetsCache,
	media: WordPressData["media"],
	mediaId: number | undefined,
	id: number,
) {
	if (mediaId == null || mediaId === 0) {
		return null;
	}

	const image = media[mediaId];
	assert(image != null, `Missing featured image (entity id ${String(id)}).`);

	const url = new URL(image.source_url);
	const asset = await upload(assetsCache, url);

	assert(asset, `Missing asset (entity id ${String(id)}).`);

	return asset.id;
}

async function readAssetsCacheData(): Promise<AssetsCache> {
	if (existsSync(assetsCacheFilePath)) {
		const data = await fs.readFile(assetsCacheFilePath, { encoding: "utf-8" });
		const cache = JSON.parse(data) as Array<[string, string]>;
		return new Map(cache);
	}

	await fs.mkdir(assetsCacheFolderPath, { recursive: true });

	return new Map();
}

async function writeAssetsCacheData(cache: AssetsCache): Promise<void> {
	await fs.writeFile(assetsCacheFilePath, JSON.stringify(Array.from(cache)), { encoding: "utf-8" });
}

async function getData(): Promise<WordPressData> {
	if (existsSync(cacheFilePath)) {
		const data = await fs.readFile(cacheFilePath, { encoding: "utf-8" });
		return JSON.parse(data) as WordPressData;
	}

	const data = await getWordPressData(apiBaseUrl);

	await fs.mkdir(cacheFolderPath, { recursive: true });
	await fs.writeFile(cacheFilePath, JSON.stringify(data, null, 2), { encoding: "utf-8" });

	return data;
}

async function main() {
	log.info("Retrieving data from wordpress...");

	const data = await getData();

	const assetsCache = await readAssetsCacheData();

	const categoriesBySlug = keyBy(Object.values(data.categories), (item) => {
		return item.slug;
	});

	const status = await db.query.entityStatus.findMany();
	const statusByType = keyBy(status, (item) => {
		return item.type;
	});

	const types = await db.query.entityTypes.findMany();
	const typesByType = keyBy(types, (item) => {
		return item.type;
	});

	//

	const placeholderImage = await upload(assetsCache, placeholderImageUrl);
	assert(placeholderImage, "Missing placeholder image.");

	//

	log.info("Migrating pages...");

	for (const page of Object.values(data.pages)) {
		assert(page.status === "publish", "Page has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: page.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.pages.id,
					createdAt: new Date(page.date_gmt),
					updatedAt: new Date(page.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			const id = entity!.id;

			const imageId = await uploadFeaturedImage(
				assetsCache,
				data.media,
				page.featured_media,
				page.id,
			);

			if (imageId == null) {
				log.warn(`Missing image (page id ${String(page.id)}).`);
			}

			await tx.insert(schema.pages).values({
				id,
				title: page.title.rendered,
				summary: page.excerpt.rendered,
				imageId,
				createdAt: new Date(page.date_gmt),
				updatedAt: new Date(page.modified_gmt),
			});

			// TODO: create content block for page.content
		});
	}

	//

	log.info("Migrating initiatives...");

	for (const page of Object.values(data.initiatives)) {
		assert(page.status === "publish", "Initiative has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: page.slug,
					statusId: statusByType.draft.id,
					typeId: typesByType.pages.id,
					createdAt: new Date(page.date_gmt),
					updatedAt: new Date(page.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			const id = entity!.id;

			const imageId = await uploadFeaturedImage(
				assetsCache,
				data.media,
				page.featured_media,
				page.id,
			);

			if (imageId == null) {
				log.warn(`Missing image (initiative id ${String(page.id)}).`);
			}

			await tx.insert(schema.pages).values({
				id,
				title: page.title.rendered,
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				summary: page.excerpt?.rendered ?? "",
				imageId,
				createdAt: new Date(page.date_gmt),
				updatedAt: new Date(page.modified_gmt),
			});

			// TODO: create content block for page.content
		});
	}

	//

	log.info("Migrating news...");

	const news = categoriesBySlug.news?.id;
	assert(news, "Missing news category.");

	for (const post of Object.values(data.posts)) {
		if (post.categories == null) {
			continue;
		}
		if (!post.categories.includes(news)) {
			continue;
		}

		assert(post.status === "publish", "News item has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: post.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.news.id,
					createdAt: new Date(post.date_gmt),
					updatedAt: new Date(post.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			const id = entity!.id;

			const imageId = await uploadFeaturedImage(
				assetsCache,
				data.media,
				post.featured_media,
				post.id,
			);

			if (imageId == null) {
				log.warn(`Missing image (news id ${String(post.id)}).`);
			}

			await tx.insert(schema.news).values({
				id,
				title: post.title.rendered,
				summary: post.excerpt.rendered,
				imageId: imageId ?? placeholderImage.id,
				createdAt: new Date(post.date_gmt),
				updatedAt: new Date(post.modified_gmt),
			});

			// TODO: create content block for page.content
		});
	}

	//

	log.info("Migrating events...");

	for (const event of Object.values(data.events)) {
		assert(event.status === "publish", "Event has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: event.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.news.id,
					createdAt: new Date(event.date_utc),
					updatedAt: new Date(event.modified_utc),
				})
				.returning({ id: schema.entities.id });

			const id = entity!.id;

			const imageId =
				event.image !== false
					? await uploadFeaturedImage(assetsCache, data.media, event.image.id, event.id)
					: null;

			if (imageId == null) {
				log.warn(`Missing image (event id ${String(event.id)}).`);
			}

			await tx.insert(schema.events).values({
				id,
				title: event.title,
				summary: event.description,
				imageId: imageId ?? placeholderImage.id,
				website: event.website,
				location:
					Array.isArray(event.venue) && event.venue.length === 0
						? ""
						: [event.venue.venue, event.venue.country].filter(isNonEmptyString).join(", "),
				duration: {
					start: event.utc_start_date,
					end: event.utc_end_date,
				},
				createdAt: new Date(event.date_utc),
				updatedAt: new Date(event.modified_utc),
			});

			// TODO: create content block for page.content
		});
	}

	//

	// log.info("Migrating countries...");

	// for (const country of Object.values(data.countries)) {
	// 	assert(country.status === "publish", "Country has not been published.");

	// 	await db.transaction(async (tx) => {
	// 		const [entity] = await tx
	// 			.insert(schema.entities)
	// 			.values({
	// 				slug: country.slug,
	// 				statusId: statusByType.published.id,
	// 				typeId: typesByType.countries.id,
	// 				createdAt: new Date(country.date_gmt),
	// 				updatedAt: new Date(country.modified_gmt),
	// 			})
	// 			.returning({ id: schema.entities.id });

	// 		const id = entity!.id;

	// 		const imageId = await uploadFeaturedImage(assetsCache, data.media, country.featured_media, country.id);

	// 		if (imageId == null) {
	// 			log.warn(`Missing image (country id ${String(country.id)}).`);
	// 		}

	// 		await tx.insert(schema.countries).values({
	// 			id,
	// 			title: country.title.rendered,
	// 			summary: country.excerpt.rendered,
	// 			imageId: imageId ?? placeholderImage.id,
	// 			createdAt: new Date(country.date_gmt),
	// 			updatedAt: new Date(country.modified_gmt),
	// 		});

	// 		// TODO: create content block for country.content
	// 	});
	// }

	//

	// log.info("Migrating people...");

	// for (const person of Object.values(data.people)) {
	// 	assert(person.status === "publish", "Person has not been published.");

	// 	await db.transaction(async (tx) => {
	// 		const [entity] = await tx
	// 			.insert(schema.entities)
	// 			.values({
	// 				slug: person.slug,
	// 				statusId: statusByType.published.id,
	// 				typeId: typesByType.persons.id,
	// 				createdAt: new Date(person.date_gmt),
	// 				updatedAt: new Date(person.modified_gmt),
	// 			})
	// 			.returning({ id: schema.entities.id });

	// 		const id = entity!.id;

	// 		const imageId = await uploadFeaturedImage(assetsCache, data.media, person.featured_media, person.id);

	// 		if (imageId == null) {
	// 			log.warn(`Missing image (person id ${String(person.id)}).`);
	// 		}

	// 		await tx.insert(schema.persons).values({
	// 			id,
	// 			name: person.title.rendered,
	// 			description: person.excerpt.rendered,
	// 			imageId: imageId ?? placeholderImage.id,
	// 			createdAt: new Date(person.date_gmt),
	// 			updatedAt: new Date(person.modified_gmt),
	// 		});

	// 		// TODO: create content block for person.content
	// 	});
	// }

	//

	// log.info("Migrating institutions...");

	// for (const institution of Object.values(data.institutions)) {
	// 	assert(institution.status === "publish", "Institution has not been published.");

	// 	await db.transaction(async (tx) => {
	// 		const [entity] = await tx
	// 			.insert(schema.entities)
	// 			.values({
	// 				slug: institution.slug,
	// 				statusId: statusByType.published.id,
	// 				typeId: typesByType.institutions.id,
	// 				createdAt: new Date(institution.date_gmt),
	// 				updatedAt: new Date(institution.modified_gmt),
	// 			})
	// 			.returning({ id: schema.entities.id });

	// 		const id = entity!.id;

	// 		const imageId = await uploadFeaturedImage(
	//      assetsCache,
	// 			data.media,
	// 			institution.featured_media,
	// 			institution.id,
	// 		);

	// 		await tx.insert(schema.institutions).values({
	// 			id,
	// 			title: institution.title.rendered,
	// 			summary: institution.excerpt.rendered,
	// 			imageId: imageId ?? placeholderImage.id,
	// 			createdAt: new Date(institution.date_gmt),
	// 			updatedAt: new Date(institution.modified_gmt),
	// 		});

	// 		// TODO: create content block for institution.content
	// 	});
	// }

	//

	// log.info("Migrating working groups...");

	// for (const workingGroup of Object.values(data.workingGroups)) {
	// 	assert(workingGroup.status === "publish", "Working group has not been published.");

	// 	await db.transaction(async (tx) => {
	// 		const [entity] = await tx
	// 			.insert(schema.entities)
	// 			.values({
	// 				slug: workingGroup.slug,
	// 				statusId: statusByType.published.id,
	// 				typeId: typesByType.workingGroups.id,
	// 				createdAt: new Date(workingGroup.date_gmt),
	// 				updatedAt: new Date(workingGroup.modified_gmt),
	// 			})
	// 			.returning({ id: schema.entities.id });

	// 		const id = entity!.id;

	// 		const imageId = await uploadFeaturedImage(
	//      assetsCache,
	// 			data.media,
	// 			workingGroup.featured_media,
	// 			workingGroup.id,
	// 		);

	// 		await tx.insert(schema.workingGroups).values({
	// 			id,
	// 			title: workingGroup.title.rendered,
	// 			summary: workingGroup.excerpt.rendered,
	// 			imageId: imageId ?? placeholderImage.id,
	// 			createdAt: new Date(workingGroup.date_gmt),
	// 			updatedAt: new Date(workingGroup.modified_gmt),
	// 		});

	// 		// TODO: create content block for workingGroup.content
	// 	});
	// }

	//

	// log.info("Migrating projects...");

	// for (const project of Object.values(data.projects)) {
	// 	assert(project.status === "publish", "Project has not been published.");

	// 	await db.transaction(async (tx) => {
	// 		const [entity] = await tx
	// 			.insert(schema.entities)
	// 			.values({
	// 				slug: project.slug,
	// 				statusId: statusByType.published.id,
	// 				typeId: typesByType.projects.id,
	// 				createdAt: new Date(project.date_gmt),
	// 				updatedAt: new Date(project.modified_gmt),
	// 			})
	// 			.returning({ id: schema.entities.id });

	// 		const id = entity!.id;

	// 		const imageId = await uploadFeaturedImage(assetsCache, data.media, project.featured_media, project.id);

	// 		await tx.insert(schema.projects).values({
	// 			id,
	// 			title: project.title.rendered,
	// 			summary: project.excerpt.rendered,
	// 			imageId: imageId ?? placeholderImage.id,
	// 			createdAt: new Date(project.date_gmt),
	// 			updatedAt: new Date(project.modified_gmt),
	// 		});

	// 		// TODO: create content block for project.content
	// 	});
	// }

	//

	log.info("Writing assets cache manifest...");

	await writeAssetsCacheData(assetsCache);

	//

	log.success("Successfully completed data migration.");
}

main()
	.catch((error: unknown) => {
		log.error("Failed to complete data migration.", error);
		process.exitCode = 1;
	})
	.finally(() => {
		return db.$client.end().catch((error: unknown) => {
			log.error("Failed to close database connection.\n", error);
			process.exitCode = 1;
		});
	});
