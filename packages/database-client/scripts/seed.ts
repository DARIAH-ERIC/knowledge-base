import { log } from "@acdh-oeaw/lib";
import { drizzle } from "drizzle-orm/node-postgres";
import { reset, seed } from "drizzle-seed";

import { env } from "../config/env.config";
import * as schema from "../src/schema";

async function main() {
	const db = drizzle({
		casing: "snake_case",
		connection: {
			database: env.DATABASE_NAME,
			host: env.DATABASE_HOST,
			password: env.DATABASE_PASSWORD,
			port: env.DATABASE_PORT,
			ssl: env.DATABASE_SSL_CONNECTION === "enabled",
			user: env.DATABASE_USER,
		},
		logger: true,
	});

	await reset(db, schema);

	/**
	 * We are seeding in multiple steps because `drizzle-seed` currently does not automatically
	 * handle unique constraints.
	 *
	 * @see {@link https://github.com/drizzle-team/drizzle-orm/issues/4354}
	 */

	await seed(
		db,
		{
			assets: schema.assets,
			licenses: schema.licenses,
			users: schema.users,
		},
		{ seed: 42 },
	).refine((f) => {
		return {
			assets: {
				columns: {
					key: f.uuid(),
				},
				count: 100,
			},
			licenses: {
				columns: {
					name: f.valuesFromArray({
						values: ["CC-BY-4.0", "CC-BY-SA-4.0", "CC0-1.0"],
						isUnique: true,
					}),
					url: f.valuesFromArray({
						values: ["https://choosealicense.com/"],
					}),
				},
				count: 3,
			},
			users: {
				columns: {
					email: f.email(),
					username: f.fullName(),
				},
				count: 10,
			},
		};
	});

	const assetIds = (await db.select({ id: schema.assets.id }).from(schema.assets)).map((row) => {
		return row.id;
	});

	await seed(
		db,
		{
			contentBlocksFields: schema.contentBlocksFields,
			dataContentBlocks: schema.dataContentBlocks,
			imageContentBlocks: schema.imageContentBlocks,
			richTextContentBlocks: schema.richTextContentBlocks,
		},
		{ seed: 42 },
	).refine((f) => {
		return {
			contentBlocksFields: {
				count: 50,
			},
			dataContentBlocks: {
				columns: {
					limit: f.int({ minValue: 1, maxValue: 100 }),
					type: f.valuesFromArray({
						values: [...schema.dataContentBlockTypes],
					}),
				},
				count: 50,
			},
			imageContentBlocks: {
				columns: {
					caption: f.loremIpsum({ sentencesCount: 1 }),
					imageId: f.valuesFromArray({
						values: assetIds,
						isUnique: true,
					}),
				},
				count: 50,
			},
			richTextContentBlocks: {
				count: 50,
			},
		};
	});

	const contentBlocksFieldsIds = (
		await db.select({ id: schema.contentBlocksFields.id }).from(schema.contentBlocksFields)
	).map((row) => {
		return row.id;
	});

	const dataContentBlocksIds = (
		await db.select({ id: schema.dataContentBlocks.id }).from(schema.dataContentBlocks)
	).map((row) => {
		return row.id;
	});

	const imageContentBlocksIds = (
		await db.select({ id: schema.imageContentBlocks.id }).from(schema.imageContentBlocks)
	).map((row) => {
		return row.id;
	});

	const richTextContentBlocksIds = (
		await db.select({ id: schema.richTextContentBlocks.id }).from(schema.richTextContentBlocks)
	).map((row) => {
		return row.id;
	});

	await seed(
		db,
		{
			contentBlocks: schema.contentBlocks,
			events: schema.events,
			eventsToResources: schema.eventsToResources,
			news: schema.news,
			newsToResources: schema.newsToResources,
		},
		{ seed: 42 },
	).refine((f) => {
		return {
			contentBlocks: {
				columns: {
					fieldId: f.valuesFromArray({
						values: contentBlocksFieldsIds,
					}),
					blockType: f.valuesFromArray({
						values: [...schema.contentBlockTypes],
					}),
					blockId: f.valuesFromArray({
						// FIXME:
						values: [
							...dataContentBlocksIds,
							...imageContentBlocksIds,
							...richTextContentBlocksIds,
						],
						isUnique: true,
					}),
					// FIXME:
					sortOrder: f.int({ minValue: 0, maxValue: 3 }),
				},
				count: 150,
			},
			events: {
				columns: {
					contentId: f.valuesFromArray({
						values: contentBlocksFieldsIds,
						isUnique: true,
					}),
					imageId: f.valuesFromArray({
						values: assetIds,
						isUnique: true,
					}),
					location: f.city(),
					slug: f.uuid(),
					summary: f.loremIpsum({ sentencesCount: 3 }),
					title: f.loremIpsum({ sentencesCount: 1 }),
					website: f.inet(),
				},
				count: 25,
			},
			eventsToResources: {
				count: 25,
			},
			news: {
				columns: {
					contentId: f.valuesFromArray({
						values: contentBlocksFieldsIds,
						isUnique: true,
					}),
					imageId: f.valuesFromArray({
						values: assetIds,
						isUnique: true,
					}),
					slug: f.uuid(),
					summary: f.loremIpsum({ sentencesCount: 3 }),
					title: f.loremIpsum({ sentencesCount: 1 }),
				},
				count: 25,
			},
			newsToResources: {
				count: 25,
			},
		};
	});

	log.success("Successfully seeded database.");
}

main().catch((error: unknown) => {
	log.error("Failed to seed database.\n", error);
	process.exitCode = 1;
});
