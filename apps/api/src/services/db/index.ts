import {
	type Database,
	type Transaction,
	createDatabaseService,
	schema,
} from "@dariah-eric/database";

import { env } from "~/config/env.config";

export const db = createDatabaseService({
	connection: {
		database: env.DATABASE_NAME,
		host: env.DATABASE_HOST,
		password: env.DATABASE_PASSWORD,
		port: env.DATABASE_PORT,
		pooler: env.DATABASE_POOLER === "enabled",
		ssl: env.DATABASE_SSL_CONNECTION === "enabled" ? "verify-full" : false,
		user: env.DATABASE_USER,
	},
	logger: env.NODE_ENV === "development",
}).unwrap();

export { type Database, schema, type Transaction };
