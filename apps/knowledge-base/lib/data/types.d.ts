import type { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";

type DB = typeof db;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface DBContext {
	ctx: DB | Transaction;
}
