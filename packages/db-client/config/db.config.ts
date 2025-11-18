import { env } from "../../../apps/knowledge-base/config/env.config";

export const credentials = {
	user: env.DATABASE_USER,
	password: env.DATABASE_PASSWORD,
	host: env.DATABASE_HOST,
	port: env.DATABASE_PORT,
	database: env.DATABASE_NAME,
	ssl: env.DATABASE_USE_SSL_CONNECTION
};
