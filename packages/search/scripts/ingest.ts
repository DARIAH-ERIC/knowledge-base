import { log } from "@acdh-oeaw/lib";

import { client } from "../src/lib/admin-client";
import { ingest } from "../src/lib/ingest";

async function main() {
	await ingest(client);

	log.success("Successfully ingested documents into typesense search index.");
}

main().catch((error: unknown) => {
	log.error("Failed to ingest documents into typesense search index.\n", error);
	process.exitCode = 1;
});
