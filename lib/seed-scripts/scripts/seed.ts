import { parseArgs } from "node:util";

import { log } from "@acdh-oeaw/lib";
import { db as databaseClient } from "@dariah-eric/dariah-knowledge-base-database-client/admin-client";
import { seed as seedDatabase } from "@dariah-eric/dariah-knowledge-base-database-client/seed";
import { client as objectStoreClient } from "@dariah-eric/dariah-knowledge-base-image-service/admin-client";
import {
	seed as seedObjectStore,
	type SeedManifest,
} from "@dariah-eric/dariah-knowledge-base-image-service/seed";
import { client as searchIndexClient } from "@dariah-eric/dariah-knowledge-base-search-index/admin-client";
import { seed as seedSearchIndex } from "@dariah-eric/dariah-knowledge-base-search-index/seed";
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

main().catch((error: unknown) => {
	log.error("Failed to seed services.", error);
	process.exitCode = 1;
});
