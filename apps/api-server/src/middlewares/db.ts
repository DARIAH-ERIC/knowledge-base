import { db as client } from "@dariah-eric/dariah-knowledge-base-database-client/client";

import { createMiddleware } from "@/lib/factory";

export type Database = typeof client;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function database(db = client) {
	return createMiddleware(async (c, next) => {
		c.set("db", db);
		await next();
	});
}
