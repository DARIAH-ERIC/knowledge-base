import { log } from "@acdh-oeaw/lib";

import { client } from "../lib/lib/admin-client";
import { reset } from "../lib/lib/reset";

async function main() {
	await reset(client);

	log.success("Successfully reset object store.");
}

main().catch((error: unknown) => {
	log.error("Failed to reset object store.\n", error);
	process.exitCode = 1;
});
