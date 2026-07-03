import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { imageSizeLimit } from "@/config/assets.config";
import { expect, test } from "@/e2e/lib/test";
import { formatFileSize } from "@/lib/format-file-size";

test.describe("website news admin", () => {
	/**
	 * Run sequentially within this file. Suites may run concurrently because test data is isolated by
	 * Playwright worker index.
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

	test("should show an inline validation error when a required image is missing", async ({
		createWebsiteNewsPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		await newsPage.gotoCreate();
		await newsPage.fillTitle(`${newsPage.workerPrefix} Missing Image ${randomUUID()}`);
		await newsPage.fillSummary("E2E test news item without image");

		const saveButton = newsPage.page.getByRole("button", {
			name: /^Save(?! and publish\b).*$/,
		});
		await expect(saveButton).toBeEnabled();
		await saveButton.click();

		await expect(newsPage.page.getByText("Please select an image.")).toBeVisible();
	});

	test("should create a news item", async ({ createWebsiteNewsPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const title = `${newsPage.workerPrefix} Test News ${randomUUID()}`;
		const summary = "E2E test news item summary";
		const testAsset = await db.getTestAsset();

		await newsPage.gotoCreate();

		await newsPage.fillTitle(title);
		await newsPage.fillSummary(summary);
		await newsPage.fillPublicationDate(2025, 1, 15);
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");

		await newsPage.submitForm();

		await newsPage.searchByTitle(title);
		await expect(newsPage.rowByTitle(title)).toBeVisible();

		const created = await db.getNewsItemByTitle(title);
		expect(created).toMatchObject({
			imageId: testAsset.id,
			publicationDate: new Date("2025-01-15T00:00:00.000Z"),
			summary,
		});
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

	test("should replace a selected image when editing a news item", async ({
		createWebsiteNewsPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const title = `${newsPage.workerPrefix} Replace Image News ${randomUUID()}`;
		const imageLabel = `${newsPage.workerPrefix} Replacement Image ${randomUUID()}`;
		const filePath = join(process.cwd(), "public/android-chrome-192x192.png");

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with replaceable image");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.submitForm();

		const before = await db.getNewsItemByTitle(title);
		expect(before).not.toBeNull();

		await newsPage.searchByTitle(title);
		await newsPage.gotoEditFromList(title);
		await newsPage.uploadImageFromMediaLibrary(filePath, imageLabel);
		await newsPage.submitForm();

		const replacementAsset = await db.getAssetByLabel(imageLabel);
		expect(replacementAsset).not.toBeNull();
		const after = await db.getNewsItemByTitle(title);
		expect(after).not.toBeNull();
		expect(after!.imageId).toBe(replacementAsset!.id);
		expect(after!.imageId).not.toBe(before!.imageId);
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

	test("should edit all news item form fields", async ({ page, createWebsiteNewsPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const originalTitle = `${newsPage.workerPrefix} Edit Me ${randomUUID()}`;
		const testAsset = await db.getTestAsset();
		await newsPage.gotoCreate();
		await newsPage.fillTitle(originalTitle);
		await newsPage.fillSummary("E2E test news item to be edited");
		await newsPage.fillPublicationDate(2025, 1, 15);
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.submitForm();

		await newsPage.searchByTitle(originalTitle);
		const row = newsPage.rowByTitle(originalTitle);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await Promise.all([
			page.waitForURL("**/edit"),
			page.getByRole("menuitem", { name: "Edit" }).click(),
		]);

		const updatedTitle = `${newsPage.workerPrefix} Updated ${randomUUID()}`;
		const updatedSummary = "Updated E2E test news item summary";
		await page.getByLabel("Title").fill(updatedTitle);
		await newsPage.fillSummary(updatedSummary);
		await newsPage.fillPublicationDate(2026, 2, 16);
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");

		await newsPage.submitForm();

		await newsPage.searchByTitle(updatedTitle);
		await expect(newsPage.rowByTitle(updatedTitle)).toBeVisible();
		await newsPage.searchByTitle(originalTitle);
		await expect(newsPage.rowByTitle(originalTitle)).toBeHidden();

		const updated = await db.getNewsItemByTitle(updatedTitle);
		expect(updated).toMatchObject({
			imageId: testAsset.id,
			publicationDate: new Date("2026-02-16T00:00:00.000Z"),
			summary: updatedSummary,
		});
	});

	test("should add, edit, and remove content blocks", async ({
		page,
		createWebsiteNewsPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const title = `${newsPage.workerPrefix} Content Blocks ${randomUUID()}`;
		const firstBlockText = `First content block ${randomUUID()}`;
		const updatedBlockText = `Updated content block ${randomUUID()}`;

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with content blocks");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.addContentBlock(firstBlockText);
		await newsPage.submitForm();

		let contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks).toHaveLength(1);
		expect(contentBlocks[0]!.type).toBe("rich_text");
		expect(JSON.stringify(contentBlocks[0]!.content)).toContain(firstBlockText);

		await newsPage.searchByTitle(title);
		await newsPage.gotoDetailsFromList(title);
		await expect(page.getByText(firstBlockText)).toBeVisible();

		await newsPage.gotoEditFromDetails();
		await newsPage.updateContentBlockText(updatedBlockText);
		await newsPage.submitForm();

		contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks).toHaveLength(1);
		expect(JSON.stringify(contentBlocks[0]!.content)).toContain(updatedBlockText);
		expect(JSON.stringify(contentBlocks[0]!.content)).not.toContain(firstBlockText);

		await newsPage.searchByTitle(title);
		await newsPage.gotoEditFromList(title);
		await newsPage.removeFirstContentBlock();
		await newsPage.submitForm();

		contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks).toHaveLength(0);
	});

	test("should save an inline callout between two rich-text blocks", async ({
		page,
		createWebsiteNewsPage,
		db,
	}) => {
		const newsPage = createWebsiteNewsPage(test.info().workerIndex);
		const title = `${newsPage.workerPrefix} Inline Callout ${randomUUID()}`;
		const above = `Rich text above ${randomUUID()}`;
		const calloutTitle = `Important ${randomUUID()}`;
		const calloutBody = `Callout body ${randomUUID()}`;
		const below = `Rich text below ${randomUUID()}`;

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with an inline callout");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.addContentWithCallout({ above, below, body: calloutBody, title: calloutTitle });
		await newsPage.submitForm();

		let contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual([
			"rich_text",
			"callout",
			"rich_text",
		]);
		expect(contentBlocks.map(({ position }) => position)).toStrictEqual([0, 1, 2]);
		expect(JSON.stringify(contentBlocks[0]!.content)).toContain(above);
		expect(contentBlocks[1]).toMatchObject({
			calloutIntent: "warning",
			calloutTitle,
		});
		expect(JSON.stringify(contentBlocks[1]!.content)).toContain(calloutBody);
		expect(JSON.stringify(contentBlocks[2]!.content)).toContain(below);

		await newsPage.searchByTitle(title);
		await newsPage.gotoDetailsFromList(title);
		await expect(page.getByText(above)).toBeVisible();
		await expect(page.getByText(calloutTitle)).toBeVisible();
		await expect(page.getByText(calloutBody)).toBeVisible();
		await expect(page.getByText(below)).toBeVisible();

		await newsPage.gotoEditFromDetails();
		await newsPage.dragCalloutBeforeText(above);
		await newsPage.submitForm();

		contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual(["callout", "rich_text"]);
		expect(contentBlocks.map(({ position }) => position)).toStrictEqual([0, 1]);
		expect(contentBlocks[0]).toMatchObject({
			calloutIntent: "warning",
			calloutTitle,
		});
		expect(JSON.stringify(contentBlocks[0]!.content)).toContain(calloutBody);
		expect(JSON.stringify(contentBlocks[1]!.content)).toContain(above);
		expect(JSON.stringify(contentBlocks[1]!.content)).toContain(below);

		await newsPage.searchByTitle(title);
		await newsPage.gotoDetailsFromList(title);
		const calloutBox = await page.getByText(calloutTitle).boundingBox();
		const aboveBox = await page.getByText(above).boundingBox();
		const belowBox = await page.getByText(below).boundingBox();
		expect(calloutBox).not.toBeNull();
		expect(aboveBox).not.toBeNull();
		expect(belowBox).not.toBeNull();
		expect(calloutBox!.y).toBeLessThan(aboveBox!.y);
		expect(aboveBox!.y).toBeLessThan(belowBox!.y);
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
