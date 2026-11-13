import { randomUUID } from "node:crypto";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { describe, expect, it } from "vitest";

import {
	createDraftDocument,
	ensureDraftVersion,
	publishVersion,
	touchVersion,
} from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import type { Transaction } from "@/lib/db";
import {
	isDelegatedChange,
	startsPendingChanges,
} from "@/lib/email/send-delegated-change-notification";
import { withTransaction } from "@/test/lib/with-transaction";

async function seedInstitution(tx: Transaction): Promise<string> {
	const [entityType, unitType] = await Promise.all([
		tx.query.entityTypes.findFirst({
			where: { type: "organisational_units" },
			columns: { id: true },
		}),
		tx.query.organisationalUnitTypes.findFirst({
			where: { type: "institution" },
			columns: { id: true },
		}),
	]);
	assert(entityType);
	assert(unitType);

	const { documentId, versionId } = await createDraftDocument(
		tx,
		entityType.id,
		`test-institution-${randomUUID()}`,
	);
	await tx
		.insert(schema.organisationalUnits)
		.values({ id: versionId, name: "Test Institution", typeId: unitType.id });
	return documentId;
}

describe("changes awaiting review", () => {
	it("notifies only the first save after an entry was published", async () => {
		await withTransaction(async (tx) => {
			const institution = await seedInstitution(tx);
			await publishVersion(tx, institution, organisationalUnitsLifecycleAdapter);

			// Opening an edit page clones a draft; it has no changes yet, so the next save starts some.
			const draftId = await ensureDraftVersion(
				tx,
				institution,
				organisationalUnitsLifecycleAdapter,
			);
			expect(await startsPendingChanges(tx, institution)).toBe(true);

			// Once a save has touched the draft, further saves continue the same round of changes.
			await touchVersion(tx, draftId, new Date(Date.now() + 1000));
			expect(await startsPendingChanges(tx, institution)).toBe(false);
		});
	});

	it("does not notify edits of a never-published entry, whose creation is notified instead", async () => {
		await withTransaction(async (tx) => {
			const institution = await seedInstitution(tx);

			expect(await startsPendingChanges(tx, institution)).toBe(false);
		});
	});
});

describe("delegated changes", () => {
	it("skips administrators, also when they impersonate someone", () => {
		expect(isDelegatedChange({ role: "user" })).toBe(true);
		expect(isDelegatedChange({ role: "admin" })).toBe(false);
		expect(isDelegatedChange({ role: "user" }, { role: "admin" })).toBe(false);
		expect(isDelegatedChange(null)).toBe(false);
	});
});
