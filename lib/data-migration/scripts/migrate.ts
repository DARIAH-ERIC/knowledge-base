import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { assert, isNonEmptyString, keyBy, log } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { createStorageService } from "@dariah-eric/storage";
import { buffer } from "@dariah-eric/storage/lib";
import { generateJSON } from "@tiptap/html";
import { StarterKit } from "@tiptap/starter-kit";
import { toText } from "hast-util-to-text";
import fromHtml from "rehype-parse";
import { unified } from "unified";

import {
	apiBaseUrl,
	assetsCacheFilePath,
	assetsCacheFolderPath,
	cacheFilePath,
	cacheFolderPath,
	placeholderImageUrl,
} from "../config/data-migration.config";
import { env } from "../config/env.config";
import { getWordPressData, type WordPressData } from "../src/lib/get-wordpress-data";

const processor = unified().use(fromHtml);

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

	const { key } = await storage.images.upload({ prefix: "images", input, metadata });

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

	const organisationalUnitTypes = await db.query.organisationalUnitTypes.findMany();
	const organisationalUnitTypesByType = keyBy(organisationalUnitTypes, (item) => {
		return item.type;
	});

	const projectScopes = await db.query.projectScopes.findMany();
	const projectScopesByType = keyBy(projectScopes, (item) => {
		return item.scope;
	});

	const contentBlockTypes = await db.query.contentBlockTypes.findMany();
	const contentBlockTypesByType = keyBy(contentBlockTypes, (item) => {
		return item.type;
	});

	const entityTypes = await db.query.entityTypes.findMany();
	const entityTypesByType = keyBy(entityTypes, (item) => {
		return item.type;
	});

	//

	function toPlaintext(html: string): string {
		const ast = processor.parse(html);
		return toText(ast);
	}

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

			assert(entity);

			const id = entity.id;

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
				title: toPlaintext(page.title.rendered),
				summary: toPlaintext(page.excerpt.rendered),
				imageId,
				createdAt: new Date(page.date_gmt),
				updatedAt: new Date(page.modified_gmt),
			});

			if (page.content.rendered.trim().length === 0) {
				return;
			}

			const content = generateJSON(page.content.rendered, [StarterKit]);

			const fieldName = await db.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.pages.id,
					fieldName: "content",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({
					position: 0,
					fieldId: field.id,
					typeId: contentBlockTypesByType.rich_text.id,
				})
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			await tx.insert(schema.richTextContentBlocks).values({
				content,
				id: contentBlock.id,
			});
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

			assert(entity);

			const id = entity.id;

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
				title: toPlaintext(page.title.rendered),
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				summary: toPlaintext(page.excerpt?.rendered ?? ""),
				imageId,
				createdAt: new Date(page.date_gmt),
				updatedAt: new Date(page.modified_gmt),
			});

			if (page.content.rendered.trim().length === 0) {
				return;
			}

			const content = generateJSON(page.content.rendered, [StarterKit]);

			const fieldName = await db.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.pages.id,
					fieldName: "content",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({
					position: 0,
					fieldId: field.id,
					typeId: contentBlockTypesByType.rich_text.id,
				})
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			await tx.insert(schema.richTextContentBlocks).values({
				content,
				id: contentBlock.id,
			});
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

			assert(entity);

			const id = entity.id;

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
				title: toPlaintext(post.title.rendered),
				summary: toPlaintext(post.excerpt.rendered),
				imageId: imageId ?? placeholderImage.id,
				createdAt: new Date(post.date_gmt),
				updatedAt: new Date(post.modified_gmt),
			});

			if (post.content.rendered.trim().length === 0) {
				return;
			}

			const content = generateJSON(post.content.rendered, [StarterKit]);

			const fieldName = await db.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.news.id,
					fieldName: "content",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({
					position: 0,
					fieldId: field.id,
					typeId: contentBlockTypesByType.rich_text.id,
				})
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			await tx.insert(schema.richTextContentBlocks).values({
				content,
				id: contentBlock.id,
			});
		});
	}

	//

	log.info("Migrating events...");

	for (const event of Object.values(data.events)) {
		assert(event.status === "publish", "Event has not been published.");
		assert(event.utc_start_date, "Event has no start date");

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

			assert(entity);

			const id = entity.id;

			const imageId =
				event.image !== false
					? await uploadFeaturedImage(assetsCache, data.media, event.image.id, event.id)
					: null;

			if (imageId == null) {
				log.warn(`Missing image (event id ${String(event.id)}).`);
			}

			await tx.insert(schema.events).values({
				id,
				title: toPlaintext(event.title),
				summary: toPlaintext(event.description),
				imageId: imageId ?? placeholderImage.id,
				website: event.website,
				location:
					Array.isArray(event.venue) && event.venue.length === 0
						? ""
						: [event.venue.venue, event.venue.country].filter(isNonEmptyString).join(", "),
				duration: {
					start: new Date(event.utc_start_date),
					end: isNonEmptyString(event.utc_end_date) ? new Date(event.utc_end_date) : undefined,
				},
				isFullDay: event.all_day,
				createdAt: new Date(event.date_utc),
				updatedAt: new Date(event.modified_utc),
			});

			if (event.description.trim().length === 0) {
				return;
			}

			const content = generateJSON(event.description, [StarterKit]);

			const fieldName = await db.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.events.id,
					fieldName: "content",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({
					position: 0,
					fieldId: field.id,
					typeId: contentBlockTypesByType.rich_text.id,
				})
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			await tx.insert(schema.richTextContentBlocks).values({
				content,
				id: contentBlock.id,
			});
		});
	}

	//

	log.info("Migrating countries...");

	for (const country of Object.values(data.countries)) {
		assert(country.status === "publish", "Country has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: country.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.organisational_units.id,
					createdAt: new Date(country.date_gmt),
					updatedAt: new Date(country.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId = await uploadFeaturedImage(
				assetsCache,
				data.media,
				country.featured_media,
				country.id,
			);

			if (imageId == null) {
				log.warn(`Missing image (country id ${String(country.id)}).`);
			}

			await tx.insert(schema.organisationalUnits).values({
				id,
				name: toPlaintext(country.title.rendered),
				summary: "",
				imageId: imageId ?? placeholderImage.id,
				typeId: organisationalUnitTypesByType.consortium.id,
				createdAt: new Date(country.date_gmt),
				updatedAt: new Date(country.modified_gmt),
			});

			if (country.content.rendered.trim().length === 0) {
				return;
			}

			const content = generateJSON(country.content.rendered, [StarterKit]);

			const fieldName = await db.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.organisational_units.id,
					fieldName: "description",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({
					position: 0,
					fieldId: field.id,
					typeId: contentBlockTypesByType.rich_text.id,
				})
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			await tx.insert(schema.richTextContentBlocks).values({
				content,
				id: contentBlock.id,
			});
		});
	}

	//

	log.info("Migrating people...");

	for (const person of Object.values(data.people)) {
		assert(person.status === "publish", "Person has not been published.");

		if (person.title.rendered.trim().length === 0) {
			log.warn("Skipping person with no name.", person.slug);
			continue;
		}

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: person.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.persons.id,
					createdAt: new Date(person.date_gmt),
					updatedAt: new Date(person.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId = await uploadFeaturedImage(
				assetsCache,
				data.media,
				person.featured_media,
				person.id,
			);

			if (imageId == null) {
				log.warn(`Missing image (person id ${String(person.id)}).`);
			}

			function getSortName(name: string) {
				const segments = name.split(" ");
				if (segments.length < 2) {
					return name;
				}
				const last = segments.pop();
				return `${last!}, ${segments.join(" ")}`;
			}

			await tx.insert(schema.persons).values({
				id,
				name: toPlaintext(person.title.rendered),
				sortName: getSortName(toPlaintext(person.title.rendered)),
				// email,
				// orcid,
				imageId: imageId ?? placeholderImage.id,
				createdAt: new Date(person.date_gmt),
				updatedAt: new Date(person.modified_gmt),
			});

			if (person.content.rendered.trim().length === 0) {
				return;
			}

			const content = generateJSON(person.content.rendered, [StarterKit]);

			const fieldName = await db.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.persons.id,
					fieldName: "biography",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({
					position: 0,
					fieldId: field.id,
					typeId: contentBlockTypesByType.rich_text.id,
				})
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			await tx.insert(schema.richTextContentBlocks).values({
				content,
				id: contentBlock.id,
			});
		});
	}

	//

	log.info("Migrating institutions...");

	for (const institution of Object.values(data.institutions)) {
		assert(institution.status === "publish", "Institution has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: institution.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.organisational_units.id,
					createdAt: new Date(institution.date_gmt),
					updatedAt: new Date(institution.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId = await uploadFeaturedImage(
				assetsCache,
				data.media,
				institution.featured_media,
				institution.id,
			);

			await tx.insert(schema.organisationalUnits).values({
				id,
				name: toPlaintext(institution.title.rendered),
				summary: "",
				typeId: organisationalUnitTypesByType.institution.id,
				imageId: imageId ?? placeholderImage.id,
				createdAt: new Date(institution.date_gmt),
				updatedAt: new Date(institution.modified_gmt),
			});

			if (institution.content.rendered.trim().length === 0) {
				return;
			}

			const content = generateJSON(institution.content.rendered, [StarterKit]);

			const fieldName = await db.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.organisational_units.id,
					fieldName: "description",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({
					position: 0,
					fieldId: field.id,
					typeId: contentBlockTypesByType.rich_text.id,
				})
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			await tx.insert(schema.richTextContentBlocks).values({
				content,
				id: contentBlock.id,
			});
		});
	}

	//

	log.info("Migrating working groups...");

	for (const workingGroup of Object.values(data.workingGroups)) {
		assert(workingGroup.status === "publish", "Working group has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: workingGroup.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.organisational_units.id,
					createdAt: new Date(workingGroup.date_gmt),
					updatedAt: new Date(workingGroup.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId = await uploadFeaturedImage(
				assetsCache,
				data.media,
				workingGroup.featured_media,
				workingGroup.id,
			);

			await tx.insert(schema.organisationalUnits).values({
				id,
				name: toPlaintext(workingGroup.title.rendered),
				summary: "",
				typeId: organisationalUnitTypesByType.working_group.id,
				imageId: imageId ?? placeholderImage.id,
				createdAt: new Date(workingGroup.date_gmt),
				updatedAt: new Date(workingGroup.modified_gmt),
			});

			if (workingGroup.content.rendered.trim().length === 0) {
				return;
			}

			const content = generateJSON(workingGroup.content.rendered, [StarterKit]);

			const fieldName = await db.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.organisational_units.id,
					fieldName: "description",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({
					position: 0,
					fieldId: field.id,
					typeId: contentBlockTypesByType.rich_text.id,
				})
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			await tx.insert(schema.richTextContentBlocks).values({
				content,
				id: contentBlock.id,
			});
		});
	}

	//

	log.info("Migrating projects...");

	for (const project of Object.values(data.projects)) {
		assert(project.status === "publish", "Project has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: project.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.projects.id,
					createdAt: new Date(project.date_gmt),
					updatedAt: new Date(project.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId = await uploadFeaturedImage(
				assetsCache,
				data.media,
				project.featured_media,
				project.id,
			);

			await tx.insert(schema.projects).values({
				id,
				name: toPlaintext(project.title.rendered),
				duration: { start: new Date() }, // FIXME: need to extract from richtext
				// funding: 0,
				summary: "",
				// call: "",
				// funders: "",
				// topic: "",
				imageId: imageId ?? placeholderImage.id,
				scopeId: projectScopesByType.national.id,
				createdAt: new Date(project.date_gmt),
				updatedAt: new Date(project.modified_gmt),
			});

			if (project.content.rendered.trim().length === 0) {
				return;
			}

			const content = generateJSON(project.content.rendered, [StarterKit]);

			const fieldName = await db.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.projects.id,
					fieldName: "description",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({
					position: 0,
					fieldId: field.id,
					typeId: contentBlockTypesByType.rich_text.id,
				})
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			await tx.insert(schema.richTextContentBlocks).values({
				content,
				id: contentBlock.id,
			});
		});
	}

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
