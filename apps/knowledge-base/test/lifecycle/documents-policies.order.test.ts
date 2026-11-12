import { randomUUID } from "node:crypto";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { describe, expect, it } from "vitest";

import {
	getDocumentPolicyOrder,
	getNextDocumentPolicyPosition,
	moveDocumentPolicy,
} from "@/lib/data/documents-policies-order";
import { documentsPoliciesLifecycleAdapter } from "@/lib/data/documents-policies.lifecycle-adapter";
import {
	createDraftDocument,
	ensureDraftVersion,
	getDocumentVersions,
	publishVersion,
} from "@/lib/data/entity-lifecycle";
import type { Transaction } from "@/lib/db";
import { and, asc, eq } from "@/lib/db/sql";
import { withTransaction } from "@/test/lib/with-transaction";

async function createGroup(tx: Transaction): Promise<string> {
	const [group] = await tx
		.insert(schema.documentPolicyGroups)
		.values({ label: `order-test-${randomUUID()}`, position: 0 })
		.returning({ id: schema.documentPolicyGroups.id });
	assert(group);
	return group.id;
}

/** A published entry, appended to the group as the create action does. */
async function createPublishedEntry(
	tx: Transaction,
	groupId: string,
	title: string,
): Promise<string> {
	const type = await tx.query.entityTypes.findFirst({
		where: { type: "documents_policies" },
		columns: { id: true },
	});
	assert(type);

	const { documentId, versionId } = await createDraftDocument(
		tx,
		type.id,
		`order-test-${randomUUID()}`,
	);

	await tx.insert(schema.documentsPolicies).values({
		id: versionId,
		title,
		linkUrl: "https://example.com",
		groupId,
		position: await getNextDocumentPolicyPosition(tx, groupId),
	});

	await publishVersion(tx, documentId, documentsPoliciesLifecycleAdapter);

	return documentId;
}

/** Titles in the order the api lists published entries. */
async function getPublishedTitles(tx: Transaction, groupId: string): Promise<Array<string>> {
	const rows = await tx
		.select({ title: schema.documentsPolicies.title })
		.from(schema.documentsPolicies)
		.innerJoin(schema.entityVersions, eq(schema.documentsPolicies.id, schema.entityVersions.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.where(
			and(eq(schema.entityStatus.type, "published"), eq(schema.documentsPolicies.groupId, groupId)),
		)
		.orderBy(asc(schema.documentsPolicies.position), asc(schema.documentsPolicies.id));

	return rows.map((row) => row.title);
}

async function getDashboardTitles(tx: Transaction, groupId: string): Promise<Array<string>> {
	const order = await getDocumentPolicyOrder(tx, groupId);
	const titles: Array<string> = [];
	for (const entityId of order) {
		const { draftId, publishedId } = await getDocumentVersions(tx, entityId);
		const row = await tx.query.documentsPolicies.findFirst({
			where: { id: (draftId ?? publishedId)! },
			columns: { title: true },
		});
		titles.push(row!.title);
	}
	return titles;
}

describe("documents and policies order", () => {
	it("keeps the published order in step with the dashboard when entries have drafts", async () => {
		await withTransaction(async (tx) => {
			const groupId = await createGroup(tx);
			const a = await createPublishedEntry(tx, groupId, "A");
			await createPublishedEntry(tx, groupId, "B");
			const c = await createPublishedEntry(tx, groupId, "C");

			// Open drafts, so each entry has two rows in the group.
			await ensureDraftVersion(tx, a, documentsPoliciesLifecycleAdapter);
			await ensureDraftVersion(tx, c, documentsPoliciesLifecycleAdapter);

			await moveDocumentPolicy(tx, c, groupId, "up");
			expect(await getDashboardTitles(tx, groupId)).toEqual(["A", "C", "B"]);
			expect(await getPublishedTitles(tx, groupId)).toEqual(["A", "C", "B"]);

			await moveDocumentPolicy(tx, c, groupId, "up");
			expect(await getDashboardTitles(tx, groupId)).toEqual(["C", "A", "B"]);
			expect(await getPublishedTitles(tx, groupId)).toEqual(["C", "A", "B"]);

			// Publishing a draft keeps the order.
			await publishVersion(tx, a, documentsPoliciesLifecycleAdapter);
			expect(await getPublishedTitles(tx, groupId)).toEqual(["C", "A", "B"]);
		});
	});

	it("does nothing at either end of the list", async () => {
		await withTransaction(async (tx) => {
			const groupId = await createGroup(tx);
			const a = await createPublishedEntry(tx, groupId, "A");
			const b = await createPublishedEntry(tx, groupId, "B");

			await moveDocumentPolicy(tx, a, groupId, "up");
			await moveDocumentPolicy(tx, b, groupId, "down");
			expect(await getPublishedTitles(tx, groupId)).toEqual(["A", "B"]);
		});
	});

	it("appends a new entry after every row in the group", async () => {
		await withTransaction(async (tx) => {
			const groupId = await createGroup(tx);
			const a = await createPublishedEntry(tx, groupId, "A");
			await ensureDraftVersion(tx, a, documentsPoliciesLifecycleAdapter);
			await createPublishedEntry(tx, groupId, "B");

			expect(await getDashboardTitles(tx, groupId)).toEqual(["A", "B"]);
			expect(await getNextDocumentPolicyPosition(tx, groupId)).toBe(2);
		});
	});
});
