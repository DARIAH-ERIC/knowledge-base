import { assert } from "@acdh-oeaw/lib";
import type { Database, Transaction } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { eq } from "drizzle-orm";

/**
 * Relations and article contributors are keyed by document id (`entities.id`). Imports build entity
 * _version_ ids, so resolve a version id to its document id before inserting into those tables.
 */
export async function documentIdOf(
	executor: Database | Transaction,
	versionId: string,
): Promise<string> {
	const [row] = await executor
		.select({ entityId: schema.entityVersions.entityId })
		.from(schema.entityVersions)
		.where(eq(schema.entityVersions.id, versionId))
		.limit(1);
	assert(row, `No entity version found for id "${versionId}".`);
	return row.entityId;
}
