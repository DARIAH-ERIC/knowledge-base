import { log } from "@acdh-oeaw/lib";

import { client } from "../src/admin-client";
import { resources } from "../src/schema";

async function main() {
	const response = await client.keys().create({
		actions: ["documents:export", "documents:get", "documents:search"],
		collections: [resources.name],
		description: `Search-only api key for "${resources.name}".`,
	});

	const apiKey = response.value!;

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
