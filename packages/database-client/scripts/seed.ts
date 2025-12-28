import { log } from "@acdh-oeaw/lib";
import { drizzle } from "drizzle-orm/node-postgres";
import { reset } from "drizzle-seed";

import { env } from "../config/env.config";
import * as schema from "../src/schema";
import { seed } from "../src/seed";

let db: ReturnType<typeof drizzle>;

async function main() {
	db = drizzle({
		casing: "snake_case",
		connection: {
			database: env.DATABASE_NAME,
			host: env.DATABASE_HOST,
			password: env.DATABASE_PASSWORD,
			port: env.DATABASE_PORT,
			ssl: env.DATABASE_SSL_CONNECTION === "enabled",
			user: env.DATABASE_USER,
		},
		logger: true,
	});

	await reset(db, schema);

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
