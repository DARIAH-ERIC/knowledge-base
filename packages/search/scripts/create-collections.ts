import { log } from "@acdh-oeaw/lib";

import { client } from "../src/lib/admin-client";
import { createCollection } from "../src/lib/create-collection";
import { resources, website } from "../src/schema";

async function main() {
	if (await createCollection(client, resources)) {
		log.success(`Successfully created collection "${resources.name}".`);
	} else {
		log.info(`Collection "${resources.name}" already exists.`);
	}

	if (await createCollection(client, website)) {
		log.success(`Successfully created collection "${website.name}".`);
	} else {
		log.info(`Collection "${website.name}" already exists.`);
	}
}

main().catch((error: unknown) => {
	log.error(`Failed to create collections".\n`, error);
	process.exitCode = 1;
});
