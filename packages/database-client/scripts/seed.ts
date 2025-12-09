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
	).refine(() => {
		return {
			assets: {
				count: 100,
			},
			licenses: {
				count: 3,
			},
			users: {
				count: 10,
			},
		};
	});

	const assetIds = (await db.select({ id: schema.assets.id }).from(schema.assets)).map((row) => {
		return row.id;
	});

	await seed(db, {
		dataBlocks: schema.dataBlocks,
		imageBlocks: schema.imageBlocks,
		richTextBlocks: schema.richTextBlocks,
		blocks: schema.blocks,
		blocksFields: schema.blocksFields,
	 }, { seed: 42 }).refine((f) => {
		return {
			dataBlocks: {
				count: 50,
			},
			imageBlocks: {
				columns: {
					imageId: f.valuesFromArray({
						values: assetIds,
						isUnique: true
					}),
				},
				count: 50,
			},
			richTextBlocks: {
				count: 50,
			},
			blocks: {
				count: 50,
			},
			blocksFields: {
				count: 50,
			},
		};
	});

	const blocksFieldIds = (await db.select({ id: schema.blocksFields.id }).from(schema.blocksFields)).map((row) => {
		return row.id;
	});

	await seed(db, {
		events: schema.events,
		news: schema.news,
	}, { seed: 42 }).refine((f) => {
		return {
			events: {
				columns: {
					imageId: f.valuesFromArray({
						values: assetIds,
						isUnique: true
					}),
					contentId: f.valuesFromArray({
						values: blocksFieldIds,
						isUnique: true,
					}),
				},
				count: 25,
			},
			news: {
				columns: {
					imageId: f.valuesFromArray({
						values: assetIds,
						isUnique: true
					}),
					contentId: f.valuesFromArray({
						values: blocksFieldIds,
						isUnique: true,
					}),
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
