import { parseArgs } from "node:util";

import { log } from "@acdh-oeaw/lib";
import { db as databaseClient, seed as seedDatabase } from "@dariah-eric/database/lib";
import { adminClient as searchIndexClient, seed as seedSearchIndex } from "@dariah-eric/search/lib";
import {
	adminClient as objectStoreClient,
	seed as seedObjectStore,
	type SeedManifest,
} from "@dariah-eric/storage/lib";
import * as v from "valibot";

const _services = ["database", "object-store", "search-index"] as const;

const ArgsSchema = v.pipe(
	v.array(v.picklist(_services)),
	v.transform((value) => {
		return value.length === 0 ? _services : value;
	}),
);

async function main() {
	const { positionals } = parseArgs({ allowPositionals: true });
	const services = new Set(v.parse(ArgsSchema, positionals));

	let seedManifest: SeedManifest | undefined;

	if (services.has("object-store")) {
		log.info("Seeding object-store...");
		seedManifest = await seedObjectStore(objectStoreClient);
	}

	if (services.has("database")) {
		log.info("Seeding database...");
		await seedDatabase(databaseClient, { seedManifest });
	}

	if (services.has("search-index")) {
		log.info("Seeding search-index...");
		await seedSearchIndex(searchIndexClient);
	}

	log.success("Successfully seeded services.");
}

main()
	.catch((error: unknown) => {
		log.error("Failed to seed services.", error);
		process.exitCode = 1;
	})
	.finally(() => {
		return databaseClient.$client.end().catch((error: unknown) => {
			log.error("Failed to close database connection.\n", error);
			process.exitCode = 1;
		});
	});
