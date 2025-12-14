import { isErr, log } from "@acdh-oeaw/lib";
import { Client } from "typesense";

import { env } from "../config/env.config";
import { getDocuments } from "../src/get-documents";
import { collection } from "../src/schema";

function createClient() {
	const apiKey = env.TYPESENSE_ADMIN_API_KEY;

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

async function ingest() {
	const client = createClient();

	const result = await getDocuments();

	if (isErr(result)) {
		throw result.error;
	}

	const documents = result.value;

	await client.collections(collection.name).documents().delete({ truncate: true });

	await client.collections(collection.name).documents().import(documents);
}

async function main() {
	await ingest();

	log.success("Successfully ingested documents into typesense search index.");
}

main().catch((error: unknown) => {
	log.error("Failed to ingest documents into typesense search index.\n", error);
	process.exitCode = 1;
});
