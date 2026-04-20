import { log } from "@acdh-oeaw/lib";

import { client } from "../src/lib/admin-client";
import { ingestWebsite } from "../src/lib/ingest-website";

async function main() {
	await ingestWebsite(client);

	log.success("Successfully ingested website documents into typesense search index.");
}

main().catch((error: unknown) => {
	log.error("Failed to ingest website documents into typesense search index.\n", error);
	process.exitCode = 1;
});
