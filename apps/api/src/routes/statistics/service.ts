/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import type { Database, Transaction } from "@/middlewares/db";

export async function getStatistics(db: Database | Transaction) {
	const items = await db.query.statistics.findMany({
		columns: {
			status: true,
			type: true,
			total: true,
		},
	});

	return items;
}
