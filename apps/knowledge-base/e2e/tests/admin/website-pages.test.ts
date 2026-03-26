import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("website pages admin", () => {
	/**
	 * Run sequentially. Also requires setting `workers: 1` in `playwright.config.ts` to
	 * avoid running test-suites concurrently.
	 */
	test.describe.configure({ mode: "default" });

	test.beforeAll(async ({ db }) => {
		/** Verify that global prerequisites exist. */
		await db.getTestAsset();
	});

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerPageItems(testInfo.workerIndex);
	});

	test("should create a page", async ({ createWebsitePagesPage }) => {
		const workerIndex = test.info().workerIndex;
		const pagesPage = createWebsitePagesPage(workerIndex);

		const title = `${pagesPage.workerPrefix} Test Page ${randomUUID()}`;

		await pagesPage.gotoCreate();

		await pagesPage.fillTitle(title);
		await pagesPage.fillSummary("E2E test page summary");

		await pagesPage.submitForm();

		await pagesPage.searchByTitle(title);
		await expect(pagesPage.pageRowByTitle(title)).toBeVisible();
	});

	test("should edit a page title", async ({ page, createWebsitePagesPage }) => {
		const workerIndex = test.info().workerIndex;
		const pagesPage = createWebsitePagesPage(workerIndex);

		const originalTitle = `${pagesPage.workerPrefix} Edit Me ${randomUUID()}`;
		await pagesPage.gotoCreate();
		await pagesPage.fillTitle(originalTitle);
		await pagesPage.fillSummary("E2E test page to be edited");
		await pagesPage.submitForm();

		await pagesPage.searchByTitle(originalTitle);
		const row = pagesPage.pageRowByTitle(originalTitle);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await page.getByRole("menuitem", { name: "Edit" }).click();
		await page.waitForURL("**/edit");

		const updatedTitle = `${pagesPage.workerPrefix} Updated ${randomUUID()}`;
		const titleField = page.getByLabel("Title");
		await titleField.clear();
		await titleField.fill(updatedTitle);

		await pagesPage.submitForm();

		await pagesPage.searchByTitle(updatedTitle);
		await expect(pagesPage.pageRowByTitle(updatedTitle)).toBeVisible();
		await pagesPage.searchByTitle(originalTitle);
		await expect(pagesPage.pageRowByTitle(originalTitle)).toBeHidden();
	});

	test("should delete a page", async ({ createWebsitePagesPage }) => {
		const workerIndex = test.info().workerIndex;
		const pagesPage = createWebsitePagesPage(workerIndex);

		const title = `${pagesPage.workerPrefix} Delete Me ${randomUUID()}`;
		await pagesPage.gotoCreate();
		await pagesPage.fillTitle(title);
		await pagesPage.fillSummary("E2E test page to be deleted");
		await pagesPage.submitForm();

		await pagesPage.searchByTitle(title);
		await expect(pagesPage.pageRowByTitle(title)).toBeVisible();

		const deleteDialog = await pagesPage.openDeleteDialog(title);
		await expect(deleteDialog).toBeVisible();
		await pagesPage.confirmDelete(deleteDialog);

		await expect(pagesPage.pageRowByTitle(title)).toBeHidden();
	});
});
