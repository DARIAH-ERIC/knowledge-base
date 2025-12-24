import { assert, log } from "@acdh-oeaw/lib";
import { Client } from "typesense";

import { env } from "../config/env.config";
import { resources } from "../src/schema";

function createClient() {
	const apiKey = env.TYPESENSE_ADMIN_API_KEY;
	assert(apiKey, "Missing `TYPESENSE_ADMIN_API_KEY` environment variable.");

	const client = new Client({
		apiKey,
		connectionTimeoutSeconds: 3,
		nodes: [
			{
				host: env.NEXT_PUBLIC_TYPESENSE_HOST,
				port: env.NEXT_PUBLIC_TYPESENSE_PORT,
				protocol: env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
			},
		],
	});

	return client;
}

async function generate() {
	const client = createClient();

	const response = await client.keys().create({
		actions: ["documents:export", "documents:get", "documents:search"],
		collections: [resources.name],
		description: `Search-only api key for "${resources.name}".`,
	});

	return response.value!;
}

async function main() {
	const apiKey = await generate();

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
