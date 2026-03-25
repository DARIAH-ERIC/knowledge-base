import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("website spotlight articles admin", () => {
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
		await db.cleanupWorkerSpotlightArticles(testInfo.workerIndex);
	});

	test("should create a spotlight article", async ({ createWebsiteSpotlightArticlesPage }) => {
		const workerIndex = test.info().workerIndex;
		const spotlightArticlesPage = createWebsiteSpotlightArticlesPage(workerIndex);

		const title = `${spotlightArticlesPage.workerPrefix} Test SA ${randomUUID()}`;

		await spotlightArticlesPage.gotoCreate();

		await spotlightArticlesPage.fillTitle(title);
		await spotlightArticlesPage.fillSummary("E2E test spotlight article summary");
		await spotlightArticlesPage.selectImageFromMediaLibrary("E2E Test Asset");

		await spotlightArticlesPage.submitForm();

		await expect(spotlightArticlesPage.rowByTitle(title)).toBeVisible();
	});

	test("should edit a spotlight article title", async ({
		page,
		createWebsiteSpotlightArticlesPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const spotlightArticlesPage = createWebsiteSpotlightArticlesPage(workerIndex);

		const originalTitle = `${spotlightArticlesPage.workerPrefix} Edit Me ${randomUUID()}`;
		await spotlightArticlesPage.gotoCreate();
		await spotlightArticlesPage.fillTitle(originalTitle);
		await spotlightArticlesPage.fillSummary("E2E test spotlight article to be edited");
		await spotlightArticlesPage.selectImageFromMediaLibrary("E2E Test Asset");
		await spotlightArticlesPage.submitForm();

		const row = spotlightArticlesPage.rowByTitle(originalTitle);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await page.getByRole("menuitem", { name: "Edit" }).click();
		await page.waitForURL("**/edit");

		const updatedTitle = `${spotlightArticlesPage.workerPrefix} Updated ${randomUUID()}`;
		const titleField = page.getByLabel("Title");
		await titleField.clear();
		await titleField.fill(updatedTitle);

		await spotlightArticlesPage.submitForm();

		await expect(spotlightArticlesPage.rowByTitle(updatedTitle)).toBeVisible();
		await expect(spotlightArticlesPage.rowByTitle(originalTitle)).toBeHidden();
	});

	test("should delete a spotlight article", async ({ createWebsiteSpotlightArticlesPage }) => {
		const workerIndex = test.info().workerIndex;
		const spotlightArticlesPage = createWebsiteSpotlightArticlesPage(workerIndex);

		const title = `${spotlightArticlesPage.workerPrefix} Delete Me ${randomUUID()}`;
		await spotlightArticlesPage.gotoCreate();
		await spotlightArticlesPage.fillTitle(title);
		await spotlightArticlesPage.fillSummary("E2E test spotlight article to be deleted");
		await spotlightArticlesPage.selectImageFromMediaLibrary("E2E Test Asset");
		await spotlightArticlesPage.submitForm();

		await expect(spotlightArticlesPage.rowByTitle(title)).toBeVisible();

		const deleteDialog = await spotlightArticlesPage.openDeleteDialog(title);
		await expect(deleteDialog).toBeVisible();
		await spotlightArticlesPage.confirmDelete(deleteDialog);

		await expect(spotlightArticlesPage.rowByTitle(title)).toBeHidden();
	});
});
