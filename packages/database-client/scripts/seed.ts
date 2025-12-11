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
				count: 100,
			},
			licenses: {
				columns: {
					name: f.valuesFromArray({
						values: ["CC-BY 4.0", "CC-BY-SA 4.0", "CC0"],
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
					username: f.firstName(),
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
			contents: schema.contents,
			blocks: schema.blocks,
			dataBlocks: schema.dataBlocks,
			imageBlocks: schema.imageBlocks,
			richTextBlocks: schema.richTextBlocks,
		},
		{ seed: 42 },
	).refine((f) => {
		return {
			contents: {
				count: 50,
			},
			blocks: {
				count: 50,
			},
			dataBlocks: {
				count: 50,
			},
			imageBlocks: {
				columns: {
					imageId: f.valuesFromArray({
						values: assetIds,
						isUnique: true,
					}),
				},
				count: 50,
			},
			richTextBlocks: {
				count: 50,
			},
		};
	});

	const blocksFieldIds = (await db.select({ id: schema.contents.id }).from(schema.contents)).map(
		(row) => {
			return row.id;
		},
	);

	await seed(
		db,
		{
			events: schema.events,
			news: schema.news,
		},
		{ seed: 42 },
	).refine((f) => {
		return {
			events: {
				columns: {
					contentId: f.valuesFromArray({
						values: blocksFieldIds,
						isUnique: true,
					}),
					imageId: f.valuesFromArray({
						values: assetIds,
						isUnique: true,
					}),
					title: f.line(),
				},
				count: 25,
			},
			news: {
				columns: {
					contentId: f.valuesFromArray({
						values: blocksFieldIds,
						isUnique: true,
					}),
					imageId: f.valuesFromArray({
						values: assetIds,
						isUnique: true,
					}),
					title: f.line(),
				},
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
