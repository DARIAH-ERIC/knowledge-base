import { testClient } from "hono/testing";

import { api } from "@/app";
import { createApp } from "@/lib/factory";
import { type Database, database, type Transaction } from "@/middlewares/db";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createTestClient(db: Database | Transaction) {
	return testClient(createApp().use(database(db)).route("/", api));
}
