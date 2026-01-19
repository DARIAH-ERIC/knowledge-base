import { log } from "@acdh-oeaw/lib";

import { client } from "../src/lib/admin-client";
import { seed } from "../src/lib/seed";

async function main() {
	await seed(client);

	log.success("Successfully seeded documents into typesense search index.");
}

main().catch((error: unknown) => {
	log.error("Failed to seed documents into typesense search index.\n", error);
	process.exitCode = 1;
});
