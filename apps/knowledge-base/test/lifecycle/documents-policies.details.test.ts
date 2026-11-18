import { randomUUID } from "node:crypto";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { describe, expect, it } from "vitest";

import { latestChangedEntityVersionWhere } from "@/lib/data/current-entity-version";
import { updateDocumentPolicyDetails } from "@/lib/data/documents-policies-details";
import { documentsPoliciesLifecycleAdapter } from "@/lib/data/documents-policies.lifecycle-adapter";
import {
	createDraftDocument,
	ensureDraftVersion,
	getDocumentLifecycleState,
	publishVersion,
	touchVersion,
} from "@/lib/data/entity-lifecycle";
import type { Transaction } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
import { withTransaction } from "@/test/lib/with-transaction";

async function createPublishedEntry(tx: Transaction, title: string): Promise<string> {
	const type = await tx.query.entityTypes.findFirst({
		where: { type: "documents_policies" },
		columns: { id: true },
	});
	assert(type);

	const { documentId, versionId } = await createDraftDocument(
		tx,
		type.id,
		`details-test-${randomUUID()}`,
	);

	await tx.insert(schema.documentsPolicies).values({
		id: versionId,
		title,
		linkUrl: "https://example.com",
		position: 0,
	});

	await publishVersion(tx, documentId, documentsPoliciesLifecycleAdapter);

	return documentId;
}

async function getTitle(tx: Transaction, versionId: string): Promise<string> {
	const row = await tx.query.documentsPolicies.findFirst({
		where: { id: versionId },
		columns: { title: true },
	});
	assert(row);
	return row.title;
}

/** The row the dashboard list shows for an entry: its id, title and whether it is badged "Draft". */
async function getListedRow(
	tx: Transaction,
	documentId: string,
): Promise<{ id: string; title: string; hasDraft: boolean }> {
	const [row] = await tx
		.select({
			id: schema.documentsPolicies.id,
			title: schema.documentsPolicies.title,
			status: schema.entityStatus.type,
		})
		.from(schema.documentsPolicies)
		.innerJoin(schema.entityVersions, eq(schema.documentsPolicies.id, schema.entityVersions.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.where(and(eq(schema.entityVersions.entityId, documentId), latestChangedEntityVersionWhere()));
	assert(row);
	return { id: row.id, title: row.title, hasDraft: row.status === "draft" };
}

function details(title: string) {
	return {
		title,
		summary: null,
		groupId: null,
		documentId: null,
		linkUrl: "https://example.com",
		url: null,
	};
}

describe("documents and policies quick edit", () => {
	it("changes the published version when the entry has a synced draft clone", async () => {
		await withTransaction(async (tx) => {
			const documentId = await createPublishedEntry(tx, "Annual Report 205");
			// Opening the edit page leaves a draft clone with the published timestamp.
			await ensureDraftVersion(tx, documentId, documentsPoliciesLifecycleAdapter);

			const before = await getDocumentLifecycleState(tx, documentId);
			assert(before.draftId != null && before.publishedId != null);
			expect(before.hasDraftChanges).toBe(false);

			const listed = await getListedRow(tx, documentId);
			expect(listed).toEqual({
				id: before.publishedId,
				title: "Annual Report 205",
				hasDraft: false,
			});

			const result = await updateDocumentPolicyDetails(tx, {
				versionId: listed.id,
				values: details("Annual Report 2025"),
			});

			expect(result).toEqual({ documentId, isPublishedChange: true });
			expect(await getTitle(tx, before.publishedId)).toBe("Annual Report 2025");
			// The clone follows, so publishing it later cannot bring the typo back.
			expect(await getTitle(tx, before.draftId)).toBe("Annual Report 2025");

			const after = await getDocumentLifecycleState(tx, documentId);
			expect(after.hasDraftChanges).toBe(false);
			expect(await getListedRow(tx, documentId)).toMatchObject({
				title: "Annual Report 2025",
				hasDraft: false,
			});
		});
	});

	it("also fixes an entry whose draft clone was changed on its own", async () => {
		await withTransaction(async (tx) => {
			const documentId = await createPublishedEntry(tx, "Annual Report 205");
			const draftId = await ensureDraftVersion(tx, documentId, documentsPoliciesLifecycleAdapter);
			// What the old quick edit did: change the clone without touching its timestamp.
			await tx
				.update(schema.documentsPolicies)
				.set({ title: "Annual Report 2025" })
				.where(eq(schema.documentsPolicies.id, draftId));

			// The list shows what's live, under the "Published" badge it carries.
			const listed = await getListedRow(tx, documentId);
			expect(listed).toMatchObject({ title: "Annual Report 205", hasDraft: false });

			const result = await updateDocumentPolicyDetails(tx, {
				versionId: listed.id,
				values: details("Annual Report 2025"),
			});

			expect(result.isPublishedChange).toBe(true);
			expect(await getListedRow(tx, documentId)).toMatchObject({
				title: "Annual Report 2025",
				hasDraft: false,
			});
		});
	});

	it("changes only the draft when it holds unpublished changes", async () => {
		await withTransaction(async (tx) => {
			const documentId = await createPublishedEntry(tx, "Live title");
			const draftId = await ensureDraftVersion(tx, documentId, documentsPoliciesLifecycleAdapter);
			await tx
				.update(schema.documentsPolicies)
				.set({ title: "Draft title" })
				.where(eq(schema.documentsPolicies.id, draftId));
			await touchVersion(tx, draftId, new Date(Date.now() + 1000));

			const listed = await getListedRow(tx, documentId);
			expect(listed).toEqual({ id: draftId, title: "Draft title", hasDraft: true });

			const result = await updateDocumentPolicyDetails(tx, {
				versionId: listed.id,
				values: details("Edited draft title"),
			});

			const { publishedId, hasDraftChanges } = await getDocumentLifecycleState(tx, documentId);
			assert(publishedId != null);

			expect(result.isPublishedChange).toBe(false);
			expect(await getTitle(tx, draftId)).toBe("Edited draft title");
			expect(await getTitle(tx, publishedId)).toBe("Live title");
			expect(hasDraftChanges).toBe(true);
		});
	});

	it("changes a never-published entry", async () => {
		await withTransaction(async (tx) => {
			const type = await tx.query.entityTypes.findFirst({
				where: { type: "documents_policies" },
				columns: { id: true },
			});
			assert(type);
			const { documentId, versionId } = await createDraftDocument(
				tx,
				type.id,
				`details-test-${randomUUID()}`,
			);
			await tx.insert(schema.documentsPolicies).values({
				id: versionId,
				title: "Draft only",
				linkUrl: "https://example.com",
				position: 0,
			});

			expect(await getListedRow(tx, documentId)).toEqual({
				id: versionId,
				title: "Draft only",
				hasDraft: true,
			});

			const result = await updateDocumentPolicyDetails(tx, {
				versionId,
				values: details("Draft only, edited"),
			});

			expect(result.isPublishedChange).toBe(false);
			expect(await getTitle(tx, versionId)).toBe("Draft only, edited");
		});
	});
});
