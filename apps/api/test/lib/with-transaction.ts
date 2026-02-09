import { db } from "@dariah-eric/database/client";

import type { Database } from "@/middlewares/db";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function withTransaction(fn: (db: Database) => Promise<void>) {
	try {
		await db.transaction(async (tx) => {
			await fn(tx as unknown as Database);
			tx.rollback();
		});
	} catch (error) {
		/** TransactionRollbackError */
		if (error instanceof Error && error.message === "Rollback") {
			return;
		}

		throw error;
	}
}
