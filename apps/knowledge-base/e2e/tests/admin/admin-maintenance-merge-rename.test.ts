import { randomUUID } from "node:crypto";

import type { Page } from "@playwright/test";

import { expect, test } from "@/e2e/lib/test";

const MAINTENANCE_PATH = "/en/dashboard/administrator/maintenance";
const WORKER_PREFIX = () => `[e2e-worker-${String(test.info().workerIndex)}]`;

/** Open the maintenance dashboard and switch to the "Merge & rename" top-level tab. */
async function gotoMergeAndRename(page: Page): Promise<void> {
	await page.goto(MAINTENANCE_PATH);
	await page.getByRole("tab", { name: "Merge & rename" }).click();
}

/** Pick an option in one of the maintenance AsyncSelect pickers, identified by its trigger label. */
async function pickEntity(
	page: Page,
	triggerName: string | RegExp,
	query: string,
	optionName: string,
): Promise<void> {
	await page.getByRole("button", { name: triggerName }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByRole("searchbox").fill(query);
	const option = dialog.getByRole("option", { name: optionName, exact: true });
	await option.waitFor({ state: "visible" });
	await option.click();
}

test.describe("admin – maintenance merge & rename", () => {
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerNewsItems(testInfo.workerIndex);
	});

	test("merges a duplicate into a canonical entity, re-pointing relations and deleting the source", async ({
		page,
		db,
	}) => {
		const asset = await db.getTestAsset();
		const relationTarget = await db.getTestEntity();

		const suffix = randomUUID();
		const sourceTitle = `${WORKER_PREFIX()} Merge Source ${suffix}`;
		const targetTitle = `${WORKER_PREFIX()} Merge Target ${suffix}`;

		const source = await db.createCollidingPublishedNewsDocument({
			slug: `merge-source-${suffix}`,
			title: sourceTitle,
			imageId: asset.id,
		});
		const target = await db.createCollidingPublishedNewsDocument({
			slug: `merge-target-${suffix}`,
			title: targetTitle,
			imageId: asset.id,
		});

		// Give the source a relation that the merge must re-point onto the target.
		await db.addEntityToEntityRelation(source.documentId, relationTarget.id);

		await gotoMergeAndRename(page);

		await pickEntity(page, "Search for the duplicate entity…", sourceTitle, sourceTitle);
		await pickEntity(page, "Search for the canonical entity…", targetTitle, targetTitle);

		await page.getByRole("button", { name: "Merge entities" }).click();

		const modal = page.getByRole("dialog", { name: "Merge entities" });
		await modal.getByRole("textbox", { name: /Type MERGE to confirm/ }).fill("MERGE");
		await modal.getByRole("button", { name: "Merge and delete source" }).click();

		await expect(page.getByText(/Merged .* into /)).toBeVisible();

		// Source document is gone; its relation now belongs to the target.
		expect(await db.entityDocumentExists(source.documentId)).toBe(false);

		const targetRelations = await db.getEntityRelations(target.documentId);
		expect(targetRelations.relatedEntityIds).toContain(relationTarget.id);
	});

	test("edits an entity slug, and rejects a colliding slug with a friendly error", async ({
		page,
		db,
	}) => {
		const asset = await db.getTestAsset();
		const suffix = randomUUID();

		const subject = await db.createCollidingPublishedNewsDocument({
			slug: `slug-subject-${suffix}`,
			title: `${WORKER_PREFIX()} Slug Subject ${suffix}`,
			imageId: asset.id,
		});
		const other = await db.createCollidingPublishedNewsDocument({
			slug: `slug-other-${suffix}`,
			title: `${WORKER_PREFIX()} Slug Other ${suffix}`,
			imageId: asset.id,
		});
		const subjectTitle = `${WORKER_PREFIX()} Slug Subject ${suffix}`;

		await page.goto(MAINTENANCE_PATH);
		await page.getByRole("tab", { name: "Merge & rename" }).click();
		await page.getByRole("tab", { name: "Edit slug" }).click();

		// Happy path: rename to a fresh, unique slug.
		const newSlug = `slug-renamed-${suffix}`;
		await pickEntity(page, "Search for an entity…", subjectTitle, subjectTitle);
		await page.getByRole("textbox", { name: "New slug" }).fill(newSlug);
		await page.getByRole("button", { name: "Update slug" }).click();

		await expect(page.getByText("Slug updated.")).toBeVisible();
		expect(await db.getEntitySlugByDocumentId(subject.documentId)).toBe(newSlug);

		// Collision: rename to the other document's slug → friendly error, slug unchanged.
		const otherSlug = await db.getEntitySlugByDocumentId(other.documentId);
		expect(otherSlug).not.toBeNull();
		await page.getByRole("textbox", { name: "New slug" }).fill(otherSlug!);
		await page.getByRole("button", { name: "Update slug" }).click();

		await expect(page.getByText("An entity with this slug already exists.")).toBeVisible();
		expect(await db.getEntitySlugByDocumentId(subject.documentId)).toBe(newSlug);
	});
});
