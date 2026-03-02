import { log } from "@acdh-oeaw/lib";

import { client } from "../lib/lib/admin-client";
import { seed } from "../lib/lib/seed";

async function main() {
	await seed(client);

	log.success("Successfully uploaded images.");
}

main().catch((error: unknown) => {
	log.error("Failed to upload images.\n", error);
	process.exitCode = 1;
});
