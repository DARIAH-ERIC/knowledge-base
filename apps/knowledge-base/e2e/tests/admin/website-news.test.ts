import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { imageSizeLimit } from "@/config/assets.config";
import { expect, test } from "@/e2e/lib/test";
import { formatFileSize } from "@/lib/format-file-size";

test.describe("website news admin", () => {
	/**
	 * Run sequentially. Also requires setting `workers: 1` in `playwright.config.ts` to avoid running
	 * test-suites concurrently.
	 */
	test.describe.configure({ mode: "default" });

	test.beforeAll(async ({ db }) => {
		/** Verify that global prerequisites exist. */
		await db.getTestAsset();
	});

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerNewsItems(testInfo.workerIndex);
		await db.cleanupWorkerAssets(testInfo.workerIndex);
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

		await newsPage.searchByTitle(title);
		await expect(newsPage.rowByTitle(title)).toBeVisible();
	});

	test("should create a news item with an uploaded image", async ({ createWebsiteNewsPage }) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const title = `${newsPage.workerPrefix} Uploaded Image News ${randomUUID()}`;
		const imageLabel = `${newsPage.workerPrefix} Uploaded Image ${randomUUID()}`;
		const filePath = join(process.cwd(), "public/android-chrome-192x192.png");

		await newsPage.gotoCreate();

		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with uploaded image");
		await newsPage.uploadImageFromMediaLibrary(filePath, imageLabel);

		await newsPage.submitForm();

		await newsPage.searchByTitle(title);
		await expect(newsPage.rowByTitle(title)).toBeVisible();
	});

	test("should show an inline error for an oversized uploaded image", async ({
		createWebsiteNewsPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		await newsPage.gotoCreate();
		await newsPage.page.getByRole("button", { name: "Select image" }).click();

		const dialog = newsPage.page.getByRole("dialog", { name: "Media library" });
		await dialog.getByRole("tab", { name: "Upload" }).click();
		await dialog.locator('input[type="file"]').setInputFiles({
			name: "oversized.png",
			mimeType: "image/png",
			buffer: Buffer.alloc(imageSizeLimit + 1),
		});

		await expect(
			dialog.getByText(
				`The selected image is too large. Choose an image smaller than ${formatFileSize(
					imageSizeLimit,
				)}.`,
			),
		).toBeVisible();
		await expect(dialog.getByRole("button", { name: "Upload" })).toBeDisabled();
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

		await newsPage.searchByTitle(originalTitle);
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

		await newsPage.searchByTitle(updatedTitle);
		await expect(newsPage.rowByTitle(updatedTitle)).toBeVisible();
		await newsPage.searchByTitle(originalTitle);
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

		await newsPage.searchByTitle(title);
		await expect(newsPage.rowByTitle(title)).toBeVisible();

		const deleteDialog = await newsPage.openDeleteDialog(title);
		await expect(deleteDialog).toBeVisible();
		await newsPage.confirmDelete(deleteDialog);

		await expect(newsPage.rowByTitle(title)).toBeHidden();
	});
});
