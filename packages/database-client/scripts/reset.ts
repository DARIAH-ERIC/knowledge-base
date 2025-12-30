import { log } from "@acdh-oeaw/lib";
import { reset } from "drizzle-seed";

import { db } from "../src/admin-client";
import * as schema from "../src/schema";

async function main() {
	await reset(db, schema);

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
