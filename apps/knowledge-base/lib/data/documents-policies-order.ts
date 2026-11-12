import * as schema from "@dariah-eric/database/schema";

import { latestEditableEntityVersionWhere } from "@/lib/data/current-entity-version";
import type { Database, Transaction } from "@/lib/db";
import { type SQL, and, asc, eq, inArray, isNull, max } from "@/lib/db/sql";

/**
 * The order of documents and policies belongs to the entry, not to one of its versions - but each
 * version (draft and published) is its own `documents_policies` row with its own `position`.
 * Ordering therefore works on entries: they are listed by their latest editable version, as the
 * dashboard shows them, and a new order is written to every version of each entry, so publishing a
 * draft cannot bring back a stale position and the website lists entries as the dashboard does.
 */

function inGroup(groupId: string | null): SQL {
	return groupId != null
		? eq(schema.documentsPolicies.groupId, groupId)
		: isNull(schema.documentsPolicies.groupId);
}

/** The entries of a group (or the ungrouped ones, for `null`) in the order the dashboard lists them. */
export async function getDocumentPolicyOrder(
	tx: Database | Transaction,
	groupId: string | null,
): Promise<Array<string>> {
	const rows = await tx
		.select({ entityId: schema.entityVersions.entityId })
		.from(schema.documentsPolicies)
		.innerJoin(schema.entityVersions, eq(schema.documentsPolicies.id, schema.entityVersions.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.where(and(inGroup(groupId), latestEditableEntityVersionWhere()))
		.orderBy(
			asc(schema.documentsPolicies.position),
			asc(schema.documentsPolicies.title),
			asc(schema.entityVersions.entityId),
		);

	return rows.map((row) => row.entityId);
}

/**
 * Numbers the entries `0..n-1` in the given order, on every version of each entry which is in the
 * group. A version in another group, e.g. the published one while a draft moves the entry
 * elsewhere, keeps its position there.
 */
export async function setDocumentPolicyOrder(
	tx: Transaction,
	groupId: string | null,
	entityIds: ReadonlyArray<string>,
): Promise<void> {
	for (const [position, entityId] of entityIds.entries()) {
		await tx
			.update(schema.documentsPolicies)
			.set({ position })
			.where(
				and(
					inGroup(groupId),
					inArray(
						schema.documentsPolicies.id,
						tx
							.select({ id: schema.entityVersions.id })
							.from(schema.entityVersions)
							.where(eq(schema.entityVersions.entityId, entityId)),
					),
				),
			);
	}
}

/**
 * The position which puts an entry last in a group. Past every row in the group rather than the
 * number of entries, as rows are per version and older data may have gaps.
 */
export async function getNextDocumentPolicyPosition(
	tx: Database | Transaction,
	groupId: string | null,
): Promise<number> {
	const [row] = await tx
		.select({ position: max(schema.documentsPolicies.position) })
		.from(schema.documentsPolicies)
		.where(inGroup(groupId));

	return (row?.position ?? -1) + 1;
}

/**
 * Swaps an entry with its neighbour in the dashboard's order. Does nothing at either end of the
 * list.
 */
export async function moveDocumentPolicy(
	tx: Transaction,
	entityId: string,
	groupId: string | null,
	direction: "down" | "up",
): Promise<void> {
	const order = await getDocumentPolicyOrder(tx, groupId);

	const index = order.indexOf(entityId);
	const target = direction === "up" ? index - 1 : index + 1;

	if (index === -1 || target < 0 || target >= order.length) {
		return;
	}

	[order[index], order[target]] = [order[target]!, order[index]!];

	await setDocumentPolicyOrder(tx, groupId, order);
}
