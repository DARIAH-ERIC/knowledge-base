import { log } from "@acdh-oeaw/lib";

import { seed } from "../src/seed";

async function main() {
	await seed();

	log.success("Successfully seeded documents into typesense search index.");
}

main().catch((error: unknown) => {
	log.error("Failed to seed documents into typesense search index.\n", error);
	process.exitCode = 1;
});
