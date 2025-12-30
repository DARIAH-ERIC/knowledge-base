import { log } from "@acdh-oeaw/lib";

import { db } from "../src/admin-client";
import { seed } from "../src/seed";

async function main() {
	await seed(db);

	log.success("Successfully seeded database.");
}

main()
	.catch((error: unknown) => {
		log.error("Failed to seed database.\n", error);
		process.exitCode = 1;
	})
	.finally(() => {
		return db.$client.end().catch((error: unknown) => {
			log.error("Failed to close database connection.\n", error);
			process.exitCode = 1;
		});
	});
