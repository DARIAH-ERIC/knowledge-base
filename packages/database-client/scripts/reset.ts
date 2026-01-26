import { log } from "@acdh-oeaw/lib";

import { db } from "../src/lib/admin-client";
import { reset } from "../src/lib/reset";

async function main() {
	await reset(db);

	log.success("Successfully reset database.");
}

main()
	.catch((error: unknown) => {
		log.error("Failed to reset database.\n", error);
		process.exitCode = 1;
	})
	.finally(() => {
		return db.$client.end().catch((error: unknown) => {
			log.error("Failed to close database connection.\n", error);
			process.exitCode = 1;
		});
	});
