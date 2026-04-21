import { log } from "@acdh-oeaw/lib";

import { client } from "../src/lib/admin-client";
import { ingest as ingestResources } from "../src/lib/ingest-resources";
import { ingest as ingestWebsite } from "../src/lib/ingest-website";

async function main() {
	log.info("Ingesting resources into typesense search index...");

	await ingestResources(client);

	log.info("Ingesting website into typesense search index...");

	await ingestWebsite(client);

	log.success("Successfully ingested documents into typesense search index.");
}

main().catch((error: unknown) => {
	log.error("Failed to ingest documents into typesense search index.\n", error);
	process.exitCode = 1;
});
