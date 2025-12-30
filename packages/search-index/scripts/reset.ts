import { log } from "@acdh-oeaw/lib";

import { client } from "../src/admin-client";
import { resources } from "../src/schema";

async function main() {
	await client.collections(resources.name).documents().delete({ truncate: true });

	log.success("Successfully reset typesense search index.");
}

main().catch((error: unknown) => {
	log.error("Failed to reset typesense search index.\n", error);
	process.exitCode = 1;
});
