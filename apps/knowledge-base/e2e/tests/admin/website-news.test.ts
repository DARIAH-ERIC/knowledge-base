import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("website news admin", () => {
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
		await db.cleanupWorkerNewsItems(testInfo.workerIndex);
	});

	test("should create a news item", async ({ createWebsiteNewsPage }) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const title = `${newsPage.workerPrefix} Test News ${randomUUID()}`;

		await newsPage.gotoCreate();

		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item summary");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");

		await newsPage.submitForm();

		await expect(newsPage.rowByTitle(title)).toBeVisible();
	});

	test("should edit a news item title", async ({ page, createWebsiteNewsPage }) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const originalTitle = `${newsPage.workerPrefix} Edit Me ${randomUUID()}`;
		await newsPage.gotoCreate();
		await newsPage.fillTitle(originalTitle);
		await newsPage.fillSummary("E2E test news item to be edited");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.submitForm();

		const row = newsPage.rowByTitle(originalTitle);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await page.getByRole("menuitem", { name: "Edit" }).click();
		await page.waitForURL("**/edit");

		const updatedTitle = `${newsPage.workerPrefix} Updated ${randomUUID()}`;
		const titleField = page.getByLabel("Title");
		await titleField.clear();
		await titleField.fill(updatedTitle);

		await newsPage.submitForm();

		await expect(newsPage.rowByTitle(updatedTitle)).toBeVisible();
		await expect(newsPage.rowByTitle(originalTitle)).toBeHidden();
	});

	test("should delete a news item", async ({ createWebsiteNewsPage }) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const title = `${newsPage.workerPrefix} Delete Me ${randomUUID()}`;
		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item to be deleted");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.submitForm();

		await expect(newsPage.rowByTitle(title)).toBeVisible();

		const deleteDialog = await newsPage.openDeleteDialog(title);
		await expect(deleteDialog).toBeVisible();
		await newsPage.confirmDelete(deleteDialog);

		await expect(newsPage.rowByTitle(title)).toBeHidden();
	});
});
