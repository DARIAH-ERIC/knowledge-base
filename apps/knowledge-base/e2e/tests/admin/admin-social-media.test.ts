import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("social media admin", () => {
	/**
	 * Run sequentially. Also requires setting `workers: 1` in `playwright.config.ts` to
	 * avoid running test-suites concurrently.
	 */
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerSocialMedia(testInfo.workerIndex);
	});

	test("should create a social media entry", async ({ createAdminSocialMediaPage }) => {
		const workerIndex = test.info().workerIndex;
		const socialMediaPage = createAdminSocialMediaPage(workerIndex);

		const name = `${socialMediaPage.workerPrefix} Test Social Media ${randomUUID()}`;

		await socialMediaPage.gotoCreate();

		await socialMediaPage.fillName(name);
		await socialMediaPage.fillUrl("https://example.com");
		await socialMediaPage.selectFirstType();

		await socialMediaPage.submitForm();

		await socialMediaPage.searchByName(name);
		await expect(socialMediaPage.rowByName(name)).toBeVisible();
	});

	test("should edit a social media name", async ({ page, createAdminSocialMediaPage }) => {
		const workerIndex = test.info().workerIndex;
		const socialMediaPage = createAdminSocialMediaPage(workerIndex);

		const originalName = `${socialMediaPage.workerPrefix} Edit Me ${randomUUID()}`;

		await socialMediaPage.gotoCreate();
		await socialMediaPage.fillName(originalName);
		await socialMediaPage.fillUrl("https://example.com");
		await socialMediaPage.selectFirstType();
		await socialMediaPage.submitForm();

		await socialMediaPage.searchByName(originalName);
		const row = socialMediaPage.rowByName(originalName);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await page.getByRole("menuitem", { name: "Edit" }).click();
		await page.waitForURL("**/edit");

		const updatedName = `${socialMediaPage.workerPrefix} Updated ${randomUUID()}`;
		const nameField = page.getByLabel("Name", { exact: true });
		await nameField.clear();
		await nameField.fill(updatedName);

		await socialMediaPage.submitForm();

		await socialMediaPage.searchByName(updatedName);
		await expect(socialMediaPage.rowByName(updatedName)).toBeVisible();
		await socialMediaPage.searchByName(originalName);
		await expect(socialMediaPage.rowByName(originalName)).toBeHidden();
	});

	test("should delete a social media entry", async ({ createAdminSocialMediaPage }) => {
		const workerIndex = test.info().workerIndex;
		const socialMediaPage = createAdminSocialMediaPage(workerIndex);

		const name = `${socialMediaPage.workerPrefix} Delete Me ${randomUUID()}`;

		await socialMediaPage.gotoCreate();
		await socialMediaPage.fillName(name);
		await socialMediaPage.fillUrl("https://example.com");
		await socialMediaPage.selectFirstType();
		await socialMediaPage.submitForm();

		await socialMediaPage.searchByName(name);
		await expect(socialMediaPage.rowByName(name)).toBeVisible();

		const deleteDialog = await socialMediaPage.openDeleteDialog(name);
		await expect(deleteDialog).toBeVisible();
		await socialMediaPage.confirmDelete(deleteDialog);

		await expect(socialMediaPage.rowByName(name)).toBeHidden();
	});
});
