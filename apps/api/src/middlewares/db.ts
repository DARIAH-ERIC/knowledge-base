import { type Database, db as client, type Transaction } from "@dariah-eric/database/client";

import { createMiddleware } from "@/lib/factory";

export type { Database, Transaction };

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function database(db: Database | Transaction = client) {
	return createMiddleware(async (c, next) => {
		c.set("db", db);
		await next();
	});
}
