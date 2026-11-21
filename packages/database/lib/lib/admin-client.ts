import { drizzle } from "drizzle-orm/postgres";

import { env } from "../../config/env.config";
import { clientDefaults } from "../client-defaults";

export type Client = Awaited<ReturnType<typeof createClient>>;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createClient() {
	const db = drizzle({
		connection: {
			...clientDefaults,
			database: env.DATABASE_NAME,
			host: env.DATABASE_HOST,
			/** Ensure single connection. */
			max: 1,
			password: env.DATABASE_PASSWORD,
			port: env.DATABASE_PORT,
			ssl: env.DATABASE_SSL_CONNECTION === "enabled" ? "verify-full" : false,
			user: env.DATABASE_USER,
		},
		logger: true,
	});

	return db;
}

export const db = createClient();
