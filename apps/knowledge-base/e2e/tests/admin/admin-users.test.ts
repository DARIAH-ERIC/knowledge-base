import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("users admin", () => {
	/**
	 * Run sequentially. Also requires setting `workers: 1` in `playwright.config.ts` to
	 * avoid running test-suites concurrently.
	 */
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerUsers(testInfo.workerIndex);
	});

	test("should create a user", async ({ createAdminUsersPage }) => {
		const workerIndex = test.info().workerIndex;
		const usersPage = createAdminUsersPage(workerIndex);

		const name = `${usersPage.workerPrefix} Test User ${randomUUID()}`;
		const email = `e2e-worker-${String(workerIndex)}+${randomUUID()}@example.com`;

		await usersPage.gotoCreate();

		await usersPage.fillName(name);
		await usersPage.fillEmail(email);
		await usersPage.fillPassword("TestPassword123!");

		await usersPage.submitForm();

		await usersPage.searchByName(name);
		await expect(usersPage.rowByName(name)).toBeVisible();
	});

	test("should edit a user name", async ({ page, createAdminUsersPage }) => {
		const workerIndex = test.info().workerIndex;
		const usersPage = createAdminUsersPage(workerIndex);

		const originalName = `${usersPage.workerPrefix} Edit Me ${randomUUID()}`;
		const email = `e2e-worker-${String(workerIndex)}+${randomUUID()}@example.com`;

		await usersPage.gotoCreate();
		await usersPage.fillName(originalName);
		await usersPage.fillEmail(email);
		await usersPage.fillPassword("TestPassword123!");
		await usersPage.submitForm();

		await usersPage.searchByName(originalName);
		const row = usersPage.rowByName(originalName);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await page.getByRole("menuitem", { name: "Edit" }).click();
		await page.waitForURL("**/edit");

		const updatedName = `${usersPage.workerPrefix} Updated ${randomUUID()}`;
		const nameField = page.getByLabel("Name", { exact: true });
		await nameField.clear();
		await nameField.fill(updatedName);

		await usersPage.submitForm();

		await usersPage.searchByName(updatedName);
		await expect(usersPage.rowByName(updatedName)).toBeVisible();
		await usersPage.searchByName(originalName);
		await expect(usersPage.rowByName(originalName)).toBeHidden();
	});

	test("should delete a user", async ({ createAdminUsersPage }) => {
		const workerIndex = test.info().workerIndex;
		const usersPage = createAdminUsersPage(workerIndex);

		const name = `${usersPage.workerPrefix} Delete Me ${randomUUID()}`;
		const email = `e2e-worker-${String(workerIndex)}+${randomUUID()}@example.com`;

		await usersPage.gotoCreate();
		await usersPage.fillName(name);
		await usersPage.fillEmail(email);
		await usersPage.fillPassword("TestPassword123!");
		await usersPage.submitForm();

		await usersPage.searchByName(name);
		await expect(usersPage.rowByName(name)).toBeVisible();

		const deleteDialog = await usersPage.openDeleteDialog(name);
		await expect(deleteDialog).toBeVisible();
		await usersPage.confirmDelete(deleteDialog);

		await expect(usersPage.rowByName(name)).toBeHidden();
	});
});
