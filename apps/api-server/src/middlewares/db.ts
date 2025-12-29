// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";

import { createMiddleware } from "@/lib/factory";

export type Database = typeof db;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function database() {
	return createMiddleware(async (c, next) => {
		c.set("db", db);
		await next();
	});
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function transaction() {
	return createMiddleware(async (c, next) => {
		await db.transaction(async (tx) => {
			c.set("db", tx as unknown as Database);
			await next();
		});
	});
}
