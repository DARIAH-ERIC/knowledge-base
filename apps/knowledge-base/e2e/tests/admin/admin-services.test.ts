import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("services admin", () => {
	/**
	 * Run sequentially. Also requires setting `workers: 1` in `playwright.config.ts` to
	 * avoid running test-suites concurrently.
	 */
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerServices(testInfo.workerIndex);
	});

	test("should create a service", async ({ createAdminServicesPage }) => {
		const workerIndex = test.info().workerIndex;
		const servicesPage = createAdminServicesPage(workerIndex);

		const name = `${servicesPage.workerPrefix} Test Service ${randomUUID()}`;

		await servicesPage.gotoCreate();

		await servicesPage.fillName(name);
		await servicesPage.selectFirstType();
		await servicesPage.selectFirstStatus();

		await servicesPage.submitForm();

		await servicesPage.searchByName(name);
		await expect(servicesPage.rowByName(name)).toBeVisible();
	});

	test("should edit a service name", async ({ page, createAdminServicesPage }) => {
		const workerIndex = test.info().workerIndex;
		const servicesPage = createAdminServicesPage(workerIndex);

		const originalName = `${servicesPage.workerPrefix} Edit Me ${randomUUID()}`;

		await servicesPage.gotoCreate();
		await servicesPage.fillName(originalName);
		await servicesPage.selectFirstType();
		await servicesPage.selectFirstStatus();
		await servicesPage.submitForm();

		await servicesPage.searchByName(originalName);
		const row = servicesPage.rowByName(originalName);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await page.getByRole("menuitem", { name: "Edit" }).click();
		await page.waitForURL("**/edit");

		const updatedName = `${servicesPage.workerPrefix} Updated ${randomUUID()}`;
		const nameField = page.getByLabel("Name", { exact: true });
		await nameField.clear();
		await nameField.fill(updatedName);

		await servicesPage.submitForm();

		await servicesPage.searchByName(updatedName);
		await expect(servicesPage.rowByName(updatedName)).toBeVisible();
		await servicesPage.searchByName(originalName);
		await expect(servicesPage.rowByName(originalName)).toBeHidden();
	});

	test("should delete a service", async ({ createAdminServicesPage }) => {
		const workerIndex = test.info().workerIndex;
		const servicesPage = createAdminServicesPage(workerIndex);

		const name = `${servicesPage.workerPrefix} Delete Me ${randomUUID()}`;

		await servicesPage.gotoCreate();
		await servicesPage.fillName(name);
		await servicesPage.selectFirstType();
		await servicesPage.selectFirstStatus();
		await servicesPage.submitForm();

		await servicesPage.searchByName(name);
		await expect(servicesPage.rowByName(name)).toBeVisible();

		const deleteDialog = await servicesPage.openDeleteDialog(name);
		await expect(deleteDialog).toBeVisible();
		await servicesPage.confirmDelete(deleteDialog);

		await expect(servicesPage.rowByName(name)).toBeHidden();
	});
});
