import { log } from "@acdh-oeaw/lib";

import { client } from "../src/admin-client";
import { seed } from "../src/seed";

async function main() {
	await seed(client);

	log.success("Successfully seeded documents into typesense search index.");
}

main().catch((error: unknown) => {
	log.error("Failed to seed documents into typesense search index.\n", error);
	process.exitCode = 1;
});
