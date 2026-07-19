import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("website pages — path field", () => {
	/** Run sequentially within this file; suites are isolated by Playwright worker index. */
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerPageItems(testInfo.workerIndex);
	});

	test("stores a normalised path and shows it on details", async ({
		page,
		createWebsitePagesPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const pagesPage = createWebsitePagesPage(workerIndex);

		const uuid = randomUUID();
		const title = `${pagesPage.workerPrefix} Path Create ${uuid}`;
		// Deliberately messy input (mixed case, spaces) to prove server-side normalisation.
		const rawPath = `/E2E Worker ${String(workerIndex)}/QA Path ${uuid}`;
		const expectedPath = `/e2e-worker-${String(workerIndex)}/qa-path-${uuid}`;

		await pagesPage.gotoCreate();
		await pagesPage.fillTitle(title);
		await pagesPage.fillSummary("E2E page-path create");
		await pagesPage.fillPath(rawPath);
		await pagesPage.submitForm();

		// Source of truth: the document stores the normalised path (not the raw input).
		const created = await db.getPageItemByTitle(title);
		expect(created?.path).toBe(expectedPath);

		// And it is surfaced on the details page.
		await pagesPage.searchByTitle(title);
		await pagesPage.gotoDetailsFromList(title);
		await expect(page.getByText(expectedPath, { exact: true })).toBeVisible();
	});

	test("freezes the path field once the page is published", async ({
		createWebsitePagesPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const pagesPage = createWebsitePagesPage(workerIndex);

		const uuid = randomUUID();
		const title = `${pagesPage.workerPrefix} Path Freeze ${uuid}`;
		const path = `/e2e-worker-${String(workerIndex)}/qa-freeze-${uuid}`;

		await pagesPage.gotoCreate();
		await pagesPage.fillTitle(title);
		await pagesPage.fillSummary("E2E page-path freeze");
		await pagesPage.fillPath(path);
		await pagesPage.submitForm();

		await pagesPage.searchByTitle(title);
		await pagesPage.gotoDetailsFromList(title);
		await pagesPage.publishItem();

		// A published path is a live URL, so the edit form freezes it (server-enforced too).
		await pagesPage.searchByTitle(title);
		await pagesPage.gotoDetailsFromList(title);
		await pagesPage.gotoEditFromDetails();

		await expect(pagesPage.pathField()).toBeDisabled();
		await expect(pagesPage.pathField()).toHaveValue(path);

		// The path really is published on the document.
		const published = await db.getPageItemByTitle(title);
		expect(published?.path).toBe(path);
	});

	test("rejects a duplicate path", async ({ page, createWebsitePagesPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const pagesPage = createWebsitePagesPage(workerIndex);

		const uuid = randomUUID();
		const path = `/e2e-worker-${String(workerIndex)}/qa-dup-${uuid}`;

		const firstTitle = `${pagesPage.workerPrefix} Path Dup A ${uuid}`;
		await pagesPage.gotoCreate();
		await pagesPage.fillTitle(firstTitle);
		await pagesPage.fillSummary("E2E page-path dup A");
		await pagesPage.fillPath(path);
		await pagesPage.submitForm();
		expect((await db.getPageItemByTitle(firstTitle))?.path).toBe(path);

		// A second page claiming the same path is refused (entities_path_unique).
		const secondTitle = `${pagesPage.workerPrefix} Path Dup B ${uuid}`;
		await pagesPage.gotoCreate();
		await pagesPage.fillTitle(secondTitle);
		await pagesPage.fillSummary("E2E page-path dup B");
		await pagesPage.fillPath(path);
		await pagesPage.submitFormExpectingError();

		await expect(page.getByText("A record with these values already exists.")).toBeVisible();
		expect(new URL(page.url()).pathname).toBe("/en/dashboard/website/pages/create");
		// The failed create rolled back — no second document exists.
		expect(await db.getPageItemByTitle(secondTitle)).toBeNull();
	});
});
