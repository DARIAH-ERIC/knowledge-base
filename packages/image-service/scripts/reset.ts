import { log } from "@acdh-oeaw/lib";

import { client } from "../src/admin-client";

async function main() {
	if (await client.bucket.exists()) {
		await client.bucket.reset();
	}

	log.success("Successfully reset object store.");
}

main().catch((error: unknown) => {
	log.error("Failed to reset object store.\n", error);
	process.exitCode = 1;
});
