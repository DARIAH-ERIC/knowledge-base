import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("working groups admin", () => {
	/**
	 * Run sequentially. Also requires setting `workers: 1` in `playwright.config.ts` to
	 * avoid running test-suites concurrently.
	 */
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerWorkingGroups(testInfo.workerIndex);
	});

	test("should create a working group", async ({ createAdminWorkingGroupsPage }) => {
		const workerIndex = test.info().workerIndex;
		const workingGroupsPage = createAdminWorkingGroupsPage(workerIndex);

		const name = `${workingGroupsPage.workerPrefix} Test WG ${randomUUID()}`;

		await workingGroupsPage.gotoCreate();

		await workingGroupsPage.fillName(name);
		await workingGroupsPage.fillSummary("E2E test working group summary.");
		await workingGroupsPage.fillDescription("E2E test working group description.");

		await workingGroupsPage.submitForm();

		await workingGroupsPage.searchByName(name);
		await expect(workingGroupsPage.rowByName(name)).toBeVisible();
	});

	test("should edit a working group name", async ({ page, createAdminWorkingGroupsPage }) => {
		const workerIndex = test.info().workerIndex;
		const workingGroupsPage = createAdminWorkingGroupsPage(workerIndex);

		const originalName = `${workingGroupsPage.workerPrefix} Edit Me ${randomUUID()}`;
		await workingGroupsPage.gotoCreate();
		await workingGroupsPage.fillName(originalName);
		await workingGroupsPage.fillSummary("E2E test working group to be edited.");
		await workingGroupsPage.fillDescription("Description for edit test.");
		await workingGroupsPage.submitForm();

		await workingGroupsPage.searchByName(originalName);
		const row = workingGroupsPage.rowByName(originalName);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await page.getByRole("menuitem", { name: "Edit" }).click();
		await page.waitForURL("**/edit");

		const updatedName = `${workingGroupsPage.workerPrefix} Updated ${randomUUID()}`;
		const nameField = page.getByLabel("Name", { exact: true });
		await nameField.clear();
		await nameField.fill(updatedName);

		await workingGroupsPage.submitForm();

		await workingGroupsPage.searchByName(updatedName);
		await expect(workingGroupsPage.rowByName(updatedName)).toBeVisible();
		await workingGroupsPage.searchByName(originalName);
		await expect(workingGroupsPage.rowByName(originalName)).toBeHidden();
	});

	test("should delete a working group", async ({ createAdminWorkingGroupsPage }) => {
		const workerIndex = test.info().workerIndex;
		const workingGroupsPage = createAdminWorkingGroupsPage(workerIndex);

		const name = `${workingGroupsPage.workerPrefix} Delete Me ${randomUUID()}`;
		await workingGroupsPage.gotoCreate();
		await workingGroupsPage.fillName(name);
		await workingGroupsPage.fillSummary("E2E test working group to be deleted.");
		await workingGroupsPage.fillDescription("Description for delete test.");
		await workingGroupsPage.submitForm();

		await workingGroupsPage.searchByName(name);
		await expect(workingGroupsPage.rowByName(name)).toBeVisible();

		const deleteDialog = await workingGroupsPage.openDeleteDialog(name);
		await expect(deleteDialog).toBeVisible();
		await workingGroupsPage.confirmDelete(deleteDialog);

		await expect(workingGroupsPage.rowByName(name)).toBeHidden();
	});
});
