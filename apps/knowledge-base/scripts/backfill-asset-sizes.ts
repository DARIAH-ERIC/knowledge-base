import { log } from "@acdh-oeaw/lib";

import { db, schema } from "@/lib/db";
import { eq, isNull } from "@/lib/db/sql";
import { storage } from "@/lib/storage";

async function main() {
	const assets = await db
		.select({ id: schema.assets.id, key: schema.assets.key })
		.from(schema.assets)
		.where(isNull(schema.assets.size));

	log.info(`Found ${String(assets.length)} assets without a stored size.`);

	let updated = 0;
	let failed = 0;

	for (const asset of assets) {
		const result = await storage.stat(asset.key);

		if (result.isErr()) {
			failed++;
			log.warn(`Failed to stat asset "${asset.key}".`, result.error);
			continue;
		}

		await db
			.update(schema.assets)
			.set({ size: result.value.size })
			.where(eq(schema.assets.id, asset.id));

		updated++;
	}

	log.success(`Backfilled ${String(updated)} asset sizes (${String(failed)} failed).`);
}

main()
	.catch((error: unknown) => {
		log.error("Failed to backfill asset sizes.\n", error);
		process.exitCode = 1;
	})
	// oxlint-disable-next-line typescript/no-misused-promises
	.finally(() =>
		// oxlint-disable-next-line typescript/strict-void-return
		db.$client.end().catch((error: unknown) => {
			log.error("Failed to close database connection.\n", error);
			process.exitCode = 1;
		}),
	);
