import { log } from "@acdh-oeaw/lib";
import { Errors } from "typesense";

import { client } from "../src/admin-client";
import { resources } from "../src/schema";

async function main() {
	try {
		await client.collections(resources.name).delete();
	} catch (error) {
		if (!(error instanceof Errors.ObjectNotFound)) {
			throw error;
		}
	}

	await client.collections().create(resources.schema);

	log.success(`Successfully created collection "${resources.name}".`);
}

main().catch((error: unknown) => {
	log.error(`Failed to create collection "${resources.name}".\n`, error);
	process.exitCode = 1;
});
