import { drizzle } from "drizzle-orm/node-postgres";

import { env } from "../../config/env.config";

export type Client = Awaited<ReturnType<typeof createClient>>;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createClient() {
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

	return db;
}

export const db = createClient();
