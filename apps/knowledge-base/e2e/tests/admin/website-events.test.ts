import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("website events admin", () => {
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
		await db.cleanupWorkerEvents(testInfo.workerIndex);
	});

	test("should create an event", async ({ createWebsiteEventsPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const eventsPage = createWebsiteEventsPage(workerIndex);

		const title = `${eventsPage.workerPrefix} Test Event ${randomUUID()}`;
		const summary = "E2E test event summary";
		const location = "Vienna, Austria";
		const website = "https://example.com/event";
		const content = `E2E event content ${randomUUID()}`;
		const testAsset = await db.getTestAsset();

		await eventsPage.gotoCreate();

		await eventsPage.fillTitle(title);
		await eventsPage.fillSummary(summary);
		await eventsPage.fillDatePicker("Start date", 2025, 6, 15);
		await eventsPage.fillLocation(location);
		await eventsPage.fillWebsite(website);
		await eventsPage.setFullDay();
		await eventsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await eventsPage.addContentBlock(content);

		await eventsPage.submitForm();

		await eventsPage.searchByTitle(title);
		await expect(eventsPage.rowByTitle(title)).toBeVisible();

		const created = await db.getEventByTitle(title);
		expect(created).toMatchObject({
			imageId: testAsset.id,
			isFullDay: true,
			location,
			summary,
			website,
		});
		expect(created?.duration.start).toStrictEqual(new Date("2025-06-15T00:00:00.000Z"));
		const contentBlocks = await db.getEventContentBlocksByTitle(title);
		expect(contentBlocks).toHaveLength(1);
		expect(JSON.stringify(contentBlocks[0]!.content)).toContain(content);
	});

	test("should edit all event form fields", async ({ page, createWebsiteEventsPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const eventsPage = createWebsiteEventsPage(workerIndex);

		const originalTitle = `${eventsPage.workerPrefix} Edit Me ${randomUUID()}`;
		await eventsPage.gotoCreate();
		await eventsPage.fillTitle(originalTitle);
		await eventsPage.fillSummary("E2E test event to be edited");
		await eventsPage.fillDatePicker("Start date", 2025, 6, 15);
		await eventsPage.fillLocation("Vienna, Austria");
		await eventsPage.fillWebsite("https://example.com/old-event");
		await eventsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await eventsPage.addContentBlock("Old event content");
		await eventsPage.submitForm();

		await eventsPage.searchByTitle(originalTitle);
		const row = eventsPage.rowByTitle(originalTitle);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await Promise.all([
			page.waitForURL("**/edit"),
			page.getByRole("menuitem", { name: "Edit" }).click(),
		]);

		const updatedTitle = `${eventsPage.workerPrefix} Updated ${randomUUID()}`;
		const updatedSummary = "Updated E2E test event summary";
		const updatedLocation = "Berlin, Germany";
		const updatedWebsite = "https://example.com/updated-event";
		const updatedContent = `Updated E2E event content ${randomUUID()}`;
		const testAsset = await db.getTestAsset();

		await page.getByLabel("Title").fill(updatedTitle);
		await eventsPage.fillSummary(updatedSummary);
		await eventsPage.fillDatePicker("Start date", 2026, 7, 16);
		await eventsPage.fillLocation(updatedLocation);
		await eventsPage.fillWebsite(updatedWebsite);
		await eventsPage.setFullDay();
		await eventsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await eventsPage.updateContentBlockText(updatedContent);

		await eventsPage.submitForm();

		await eventsPage.searchByTitle(updatedTitle);
		await expect(eventsPage.rowByTitle(updatedTitle)).toBeVisible();
		await eventsPage.searchByTitle(originalTitle);
		await expect(eventsPage.rowByTitle(originalTitle)).toBeHidden();

		const updated = await db.getEventByTitle(updatedTitle);
		expect(updated).toMatchObject({
			imageId: testAsset.id,
			isFullDay: true,
			location: updatedLocation,
			summary: updatedSummary,
			website: updatedWebsite,
		});
		expect(updated?.duration.start).toStrictEqual(new Date("2026-07-16T00:00:00.000Z"));
		const contentBlocks = await db.getEventContentBlocksByTitle(updatedTitle);
		expect(contentBlocks).toHaveLength(1);
		expect(JSON.stringify(contentBlocks[0]!.content)).toContain(updatedContent);
	});

	test("should delete an event", async ({ createWebsiteEventsPage }) => {
		const workerIndex = test.info().workerIndex;
		const eventsPage = createWebsiteEventsPage(workerIndex);

		const title = `${eventsPage.workerPrefix} Delete Me ${randomUUID()}`;
		await eventsPage.gotoCreate();
		await eventsPage.fillTitle(title);
		await eventsPage.fillSummary("E2E test event to be deleted");
		await eventsPage.fillDatePicker("Start date", 2025, 6, 15);
		await eventsPage.fillLocation("Vienna, Austria");
		await eventsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await eventsPage.submitForm();

		await eventsPage.searchByTitle(title);
		await expect(eventsPage.rowByTitle(title)).toBeVisible();

		const deleteDialog = await eventsPage.openDeleteDialog(title);
		await expect(deleteDialog).toBeVisible();
		await eventsPage.confirmDelete(deleteDialog);

		await expect(eventsPage.rowByTitle(title)).toBeHidden();
	});
});
