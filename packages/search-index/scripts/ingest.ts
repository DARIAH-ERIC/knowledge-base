import { isErr, log } from "@acdh-oeaw/lib";

import { client } from "../src/admin-client";
import { getDocuments } from "../src/get-documents";
import { resources } from "../src/schema";

async function main() {
	const result = await getDocuments();

	if (isErr(result)) {
		throw result.error;
	}

	const documents = result.value;

	await client.collections(resources.name).documents().delete({ truncate: true });

	await client.collections(resources.name).documents().import(documents);

	log.success("Successfully ingested documents into typesense search index.");
}

main().catch((error: unknown) => {
	log.error("Failed to ingest documents into typesense search index.\n", error);
	process.exitCode = 1;
});
