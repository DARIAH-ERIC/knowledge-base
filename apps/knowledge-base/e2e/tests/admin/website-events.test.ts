import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("website events admin", () => {
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
		await db.cleanupWorkerEvents(testInfo.workerIndex);
	});

	test("should create an event", async ({ createWebsiteEventsPage }) => {
		const workerIndex = test.info().workerIndex;
		const eventsPage = createWebsiteEventsPage(workerIndex);

		const title = `${eventsPage.workerPrefix} Test Event ${randomUUID()}`;

		await eventsPage.gotoCreate();

		await eventsPage.fillTitle(title);
		await eventsPage.fillSummary("E2E test event summary");
		await eventsPage.fillDatePicker("Start date", 2025, 6, 15);
		await eventsPage.fillLocation("Vienna, Austria");
		await eventsPage.selectImageFromMediaLibrary("e2e-test-asset");

		await eventsPage.submitForm();

		await expect(eventsPage.rowByTitle(title)).toBeVisible();
	});

	test("should edit an event title", async ({ page, createWebsiteEventsPage }) => {
		const workerIndex = test.info().workerIndex;
		const eventsPage = createWebsiteEventsPage(workerIndex);

		const originalTitle = `${eventsPage.workerPrefix} Edit Me ${randomUUID()}`;
		await eventsPage.gotoCreate();
		await eventsPage.fillTitle(originalTitle);
		await eventsPage.fillSummary("E2E test event to be edited");
		await eventsPage.fillDatePicker("Start date", 2025, 6, 15);
		await eventsPage.fillLocation("Vienna, Austria");
		await eventsPage.selectImageFromMediaLibrary("e2e-test-asset");
		await eventsPage.submitForm();

		const row = eventsPage.rowByTitle(originalTitle);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await page.getByRole("menuitem", { name: "Edit" }).click();
		await page.waitForURL("**/edit");

		const updatedTitle = `${eventsPage.workerPrefix} Updated ${randomUUID()}`;
		const titleField = page.getByLabel("Title");
		await titleField.clear();
		await titleField.fill(updatedTitle);

		await eventsPage.submitForm();

		await expect(eventsPage.rowByTitle(updatedTitle)).toBeVisible();
		await expect(eventsPage.rowByTitle(originalTitle)).toBeHidden();
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
		await eventsPage.selectImageFromMediaLibrary("e2e-test-asset");
		await eventsPage.submitForm();

		await expect(eventsPage.rowByTitle(title)).toBeVisible();

		const deleteDialog = await eventsPage.openDeleteDialog(title);
		await expect(deleteDialog).toBeVisible();
		await eventsPage.confirmDelete(deleteDialog);

		await expect(eventsPage.rowByTitle(title)).toBeHidden();
	});
});
