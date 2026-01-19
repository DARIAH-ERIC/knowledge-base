import { log } from "@acdh-oeaw/lib";

import { client } from "../src/lib/admin-client";
import { createCollection } from "../src/lib/create-collection";
import { resources } from "../src/schema";

async function main() {
	const isCreated = await createCollection(client);

	if (isCreated) {
		log.success(`Successfully created collection "${resources.name}".`);
	} else {
		log.info(`Collection "${resources.name}" already exists.`);
	}
}

main().catch((error: unknown) => {
	log.error(`Failed to create collection "${resources.name}".\n`, error);
	process.exitCode = 1;
});
