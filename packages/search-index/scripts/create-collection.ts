import { log } from "@acdh-oeaw/lib";
import { Client, Errors } from "typesense";

import { env } from "../config/env.config";
import { resources } from "../src/schema";

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

async function createCollection() {
	const client = createClient();

	try {
		await client.collections(resources.name).delete();
	} catch (error) {
		if (!(error instanceof Errors.ObjectNotFound)) {
			throw error;
		}
	}

	await client.collections().create(resources.schema);
}

async function main() {
	await createCollection();

	log.success(`Successfully created collection "${resources.name}".`);
}

main().catch((error: unknown) => {
	log.error(`Failed to create collection "${resources.name}".\n`, error);
	process.exitCode = 1;
});
