import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("website impact case studies admin", () => {
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
		await db.cleanupWorkerImpactCaseStudies(testInfo.workerIndex);
	});

	test("should create an impact case study", async ({ createWebsiteImpactCaseStudiesPage }) => {
		const workerIndex = test.info().workerIndex;
		const impactCaseStudiesPage = createWebsiteImpactCaseStudiesPage(workerIndex);

		const title = `${impactCaseStudiesPage.workerPrefix} Test ICS ${randomUUID()}`;

		await impactCaseStudiesPage.gotoCreate();

		await impactCaseStudiesPage.fillTitle(title);
		await impactCaseStudiesPage.fillSummary("E2E test impact case study summary");
		await impactCaseStudiesPage.selectImageFromMediaLibrary("E2E Test Asset");

		await impactCaseStudiesPage.submitForm();

		await impactCaseStudiesPage.searchByTitle(title);
		await expect(impactCaseStudiesPage.rowByTitle(title)).toBeVisible();
	});

	test("should edit an impact case study title", async ({
		page,
		createWebsiteImpactCaseStudiesPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const impactCaseStudiesPage = createWebsiteImpactCaseStudiesPage(workerIndex);

		const originalTitle = `${impactCaseStudiesPage.workerPrefix} Edit Me ${randomUUID()}`;
		await impactCaseStudiesPage.gotoCreate();
		await impactCaseStudiesPage.fillTitle(originalTitle);
		await impactCaseStudiesPage.fillSummary("E2E test impact case study to be edited");
		await impactCaseStudiesPage.selectImageFromMediaLibrary("E2E Test Asset");
		await impactCaseStudiesPage.submitForm();

		await impactCaseStudiesPage.searchByTitle(originalTitle);
		const row = impactCaseStudiesPage.rowByTitle(originalTitle);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await page.getByRole("menuitem", { name: "Edit" }).click();
		await page.waitForURL("**/edit");

		const updatedTitle = `${impactCaseStudiesPage.workerPrefix} Updated ${randomUUID()}`;
		const titleField = page.getByLabel("Title");
		await titleField.clear();
		await titleField.fill(updatedTitle);

		await impactCaseStudiesPage.submitForm();

		await impactCaseStudiesPage.searchByTitle(updatedTitle);
		await expect(impactCaseStudiesPage.rowByTitle(updatedTitle)).toBeVisible();
		await impactCaseStudiesPage.searchByTitle(originalTitle);
		await expect(impactCaseStudiesPage.rowByTitle(originalTitle)).toBeHidden();
	});

	test("should delete an impact case study", async ({ createWebsiteImpactCaseStudiesPage }) => {
		const workerIndex = test.info().workerIndex;
		const impactCaseStudiesPage = createWebsiteImpactCaseStudiesPage(workerIndex);

		const title = `${impactCaseStudiesPage.workerPrefix} Delete Me ${randomUUID()}`;
		await impactCaseStudiesPage.gotoCreate();
		await impactCaseStudiesPage.fillTitle(title);
		await impactCaseStudiesPage.fillSummary("E2E test impact case study to be deleted");
		await impactCaseStudiesPage.selectImageFromMediaLibrary("E2E Test Asset");
		await impactCaseStudiesPage.submitForm();

		await impactCaseStudiesPage.searchByTitle(title);
		await expect(impactCaseStudiesPage.rowByTitle(title)).toBeVisible();

		const deleteDialog = await impactCaseStudiesPage.openDeleteDialog(title);
		await expect(deleteDialog).toBeVisible();
		await impactCaseStudiesPage.confirmDelete(deleteDialog);

		await expect(impactCaseStudiesPage.rowByTitle(title)).toBeHidden();
	});
});
