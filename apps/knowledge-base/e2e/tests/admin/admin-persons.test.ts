import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("persons admin", () => {
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
		await db.cleanupWorkerPersons(testInfo.workerIndex);
	});

	test("should create a person", async ({ createAdminPersonsPage }) => {
		const workerIndex = test.info().workerIndex;
		const personsPage = createAdminPersonsPage(workerIndex);

		const name = `${personsPage.workerPrefix} Test Person ${randomUUID()}`;

		await personsPage.gotoCreate();

		await personsPage.fillName(name);
		await personsPage.fillSortName("Person, Test");
		await personsPage.selectImageFromMediaLibrary("E2E Test Asset");

		await personsPage.submitForm();

		await personsPage.searchByName(name);
		await expect(personsPage.rowByName(name)).toBeVisible();
	});

	test("should edit a person name", async ({ page, createAdminPersonsPage }) => {
		const workerIndex = test.info().workerIndex;
		const personsPage = createAdminPersonsPage(workerIndex);

		const originalName = `${personsPage.workerPrefix} Edit Me ${randomUUID()}`;
		await personsPage.gotoCreate();
		await personsPage.fillName(originalName);
		await personsPage.fillSortName("Me, Edit");
		await personsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await personsPage.submitForm();

		await personsPage.searchByName(originalName);
		const row = personsPage.rowByName(originalName);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await page.getByRole("menuitem", { name: "Edit" }).click();
		await page.waitForURL("**/edit");

		const updatedName = `${personsPage.workerPrefix} Updated ${randomUUID()}`;
		const nameField = page.getByLabel("Name", { exact: true });
		await nameField.clear();
		await nameField.fill(updatedName);

		await personsPage.submitForm();

		await personsPage.searchByName(updatedName);
		await expect(personsPage.rowByName(updatedName)).toBeVisible();
		await personsPage.searchByName(originalName);
		await expect(personsPage.rowByName(originalName)).toBeHidden();
	});

	test("should delete a person", async ({ createAdminPersonsPage }) => {
		const workerIndex = test.info().workerIndex;
		const personsPage = createAdminPersonsPage(workerIndex);

		const name = `${personsPage.workerPrefix} Delete Me ${randomUUID()}`;
		await personsPage.gotoCreate();
		await personsPage.fillName(name);
		await personsPage.fillSortName("Me, Delete");
		await personsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await personsPage.submitForm();

		await personsPage.searchByName(name);
		await expect(personsPage.rowByName(name)).toBeVisible();

		const deleteDialog = await personsPage.openDeleteDialog(name);
		await expect(deleteDialog).toBeVisible();
		await personsPage.confirmDelete(deleteDialog);

		await expect(personsPage.rowByName(name)).toBeHidden();
	});
});
