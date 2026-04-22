import { log } from "@acdh-oeaw/lib";

import { client } from "../src/lib/admin-client";
import { ingest } from "../src/lib/ingest-resources";

async function main() {
	log.info("Ingesting resources into typesense search index...");

	await ingest(client);

	log.success("Successfully ingested resource documents into typesense search index.");
}

main().catch((error: unknown) => {
	log.error("Failed to ingest resource documents into typesense search index.\n", error);
	process.exitCode = 1;
});
