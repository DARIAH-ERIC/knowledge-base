import { isErr } from "@acdh-oeaw/lib";

import { getDocuments } from "../get-documents";
import { resources } from "../schema";
import type { Client } from "./admin-client";

export async function ingest(client: Client): Promise<void> {
	const result = await getDocuments();

	if (isErr(result)) {
		throw result.error;
	}

	const documents = result.value;

	await client.collections(resources.name).documents().import(documents);
}
