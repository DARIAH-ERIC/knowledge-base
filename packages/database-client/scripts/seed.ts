import { log } from "@acdh-oeaw/lib";
import { drizzle } from "drizzle-orm/node-postgres";
import { seed } from "drizzle-seed";

import { env } from "../config/env.config";
import { assets, events, news } from "../src/schema";

async function main() {
	const db = drizzle({
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

	await seed(db, { assets, events, news });

	log.success("Successfully seeded database.");
}

main().catch((error: unknown) => {
	log.error("Failed to seed database.\n", error);
	process.exitCode = 1;
});
