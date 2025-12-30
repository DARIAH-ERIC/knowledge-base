import { log } from "@acdh-oeaw/lib";

import { client } from "../src/lib/admin-client";
import { generateSearchApiKey } from "../src/lib/generate-search-api-key";
import { resources } from "../src/schema";

async function main() {
	const apiKey = await generateSearchApiKey(client);

	log.success(
		`Successfully generated api key "${apiKey}" for collection "${resources.name}" in typesense search index.`,
	);
}

main().catch((error: unknown) => {
	log.error(
		`Failed to generate api key for collection "${resources.name}" in typesense search index.\n`,
		error,
	);
	process.exitCode = 1;
});
