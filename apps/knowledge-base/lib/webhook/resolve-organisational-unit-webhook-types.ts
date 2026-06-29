import * as schema from "@dariah-eric/database/schema";

import type { Database, Transaction } from "@/lib/db";
import { eq, inArray, sql } from "@/lib/db/sql";
import {
	type WebhookEntityType,
	organisationalUnitWebhookType,
} from "@/lib/webhook/dispatch-webhook";

/**
 * Resolves organisational-unit document ids to their per-unit-type revalidation entity types, so a
 * relation mutation can tell the website which unit-type pages embed the affected units. Each
 * document is resolved to its current (published-or-draft) version to read its unit type; duplicate
 * types collapse to a single entry.
 */
export async function resolveOrganisationalUnitWebhookTypes(
	client: Database | Transaction,
	documentIds: Array<string>,
): Promise<Array<WebhookEntityType>> {
	if (documentIds.length === 0) {
		return [];
	}

	const rows = await client
		.select({ type: schema.organisationalUnitTypes.type })
		.from(schema.organisationalUnits)
		.innerJoin(
			schema.documentLifecycle,
			sql`${schema.organisationalUnits.id} = COALESCE(${schema.documentLifecycle.publishedId}, ${schema.documentLifecycle.draftId})`,
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.where(inArray(schema.documentLifecycle.documentId, documentIds));

	return [...new Set(rows.map((row) => organisationalUnitWebhookType(row.type)))];
}
