import { log } from "@acdh-oeaw/lib";

import { client } from "../src/lib/admin-client";
import { reset } from "../src/lib/reset";

async function main() {
	await reset(client);

	log.success("Successfully reset typesense search index.");
}

main().catch((error: unknown) => {
	log.error("Failed to reset typesense search index.\n", error);
	process.exitCode = 1;
});
