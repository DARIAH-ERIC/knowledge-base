import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

import { assert, keyBy, log } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { client } from "@dariah-eric/dariah-knowledge-base-image-service/client";
import slugify from "@sindresorhus/slugify";

import { getWordPressData, type WordPressData } from "../src/lib/get-wordpress-data";

const apiBaseUrl = "https://www.dariah.eu";

const outputFolderPath = path.join(process.cwd(), ".cache");
const outputFilePath = path.join(outputFolderPath, "wordpress.json");

async function uploadFeaturedImage(
	media: WordPressData["media"],
	mediaId: number | undefined,
	id: number,
) {
	if (mediaId == null || mediaId === 0) {
		return null;
	}

	const image = media[mediaId];
	assert(image != null, `Missing featured image (entity id ${String(id)}).`);

	const response = await fetch(image.link);
	const stream = Readable.fromWeb(response.body! as ReadableStream);
	// const stream = await request(image.link, { responseType: "stream" });

	const fileName = image.media_details.file as string | undefined;
	assert(fileName, "Missing image file name.");
	const { objectName: key } = await client.images.upload(
		slugify(path.basename(fileName)),
		stream,
		undefined,
		{ "content-type": image.mime_type },
	);

	const [asset] = await db
		.insert(schema.assets)
		.values({
			key,
		})
		.returning({ id: schema.assets.id });

	assert(asset, `Missing asset (entity  id ${String(id)}).`);

	return asset.id;
}

async function getData(): Promise<WordPressData> {
	if (existsSync(outputFolderPath)) {
		const data = await fs.readFile(outputFilePath, { encoding: "utf-8" });
		return JSON.parse(data) as WordPressData;
	}

	const data = await getWordPressData(apiBaseUrl);

	await fs.mkdir(outputFolderPath, { recursive: true });
	await fs.writeFile(outputFilePath, JSON.stringify(data, null, 2), { encoding: "utf-8" });

	return data;
}

async function main() {
	log.info("Retrieving data from wordpress...");

	const data = await getData();

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

			const imageId = await uploadFeaturedImage(data.media, page.featured_media, page.id);

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

			const imageId = await uploadFeaturedImage(data.media, post.featured_media, post.id);
			if (imageId == null) {
				console.warn(`Missing news image (news id ${String(post.id)}).`);
				return;
			}
			assert(imageId, `Missing news image (news id ${String(post.id)}).`);

			await tx.insert(schema.news).values({
				id,
				title: post.title.rendered,
				summary: post.excerpt.rendered,
				imageId,
				createdAt: new Date(post.date_gmt),
				updatedAt: new Date(post.modified_gmt),
			});

			// TODO: create content block for page.content
		});
	}

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
