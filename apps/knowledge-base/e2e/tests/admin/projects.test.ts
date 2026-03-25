import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("projects admin", () => {
	/**
	 * Run sequentially. Also requires setting `workers: 1` in `playwright.config.ts` to
	 * avoid running test-suites concurrently.
	 */
	test.describe.configure({ mode: "default" });

	test.beforeAll(async ({ db }) => {
		/** Verify that global prerequisites exist. */
		await db.getTestAsset();
		await db.getProjectScope();
	});

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerProjects(testInfo.workerIndex);
	});

	test("should create a project", async ({ createAdminProjectsPage }) => {
		const workerIndex = test.info().workerIndex;
		const adminProjectsPage = createAdminProjectsPage(workerIndex);

		const projectName = `${adminProjectsPage.workerPrefix} Test Project ${randomUUID()}`;

		await adminProjectsPage.gotoCreate();

		await adminProjectsPage.fillName(projectName);
		await adminProjectsPage.selectFirstScope();
		await adminProjectsPage.fillDatePicker("Start date", 2024, 1, 15);
		await adminProjectsPage.fillSummary("E2E test project summary");

		await adminProjectsPage.selectImageFromMediaLibrary("E2E Test Asset");

		await adminProjectsPage.fillDescription("E2E test project description.");

		await adminProjectsPage.submitForm();

		await expect(adminProjectsPage.projectRowByName(projectName)).toBeVisible();
	});

	test("should edit a project name", async ({ page, createAdminProjectsPage }) => {
		const workerIndex = test.info().workerIndex;
		const adminProjectsPage = createAdminProjectsPage(workerIndex);

		const originalName = `${adminProjectsPage.workerPrefix} Edit Me ${randomUUID()}`;
		await adminProjectsPage.gotoCreate();
		await adminProjectsPage.fillName(originalName);
		await adminProjectsPage.selectFirstScope();
		await adminProjectsPage.fillDatePicker("Start date", 2024, 1, 15);
		await adminProjectsPage.fillSummary("E2E test project to be edited");
		await adminProjectsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await adminProjectsPage.fillDescription("Description for edit test.");
		await adminProjectsPage.submitForm();

		// Find the project row and navigate to its edit page via the slug.
		// The slug is derived from the name; we navigate via the actions menu.
		const row = adminProjectsPage.projectRowByName(originalName);
		await expect(row).toBeVisible();

		// Click the edit menu item for this row.
		await row.getByRole("button", { name: "Open actions menu" }).click();
		await page.getByRole("menuitem", { name: "Edit" }).click();
		await page.waitForURL("**/edit");

		// Update the project name.
		const updatedName = `${adminProjectsPage.workerPrefix} Updated ${randomUUID()}`;
		const nameField = page.getByLabel("Name");
		await nameField.clear();
		await nameField.fill(updatedName);

		await adminProjectsPage.submitForm();

		// The updated name should appear in the list.
		await expect(adminProjectsPage.projectRowByName(updatedName)).toBeVisible();
		await expect(adminProjectsPage.projectRowByName(originalName)).toBeHidden();
	});

	test("should delete a project", async ({ createAdminProjectsPage }) => {
		const workerIndex = test.info().workerIndex;
		const adminProjectsPage = createAdminProjectsPage(workerIndex);

		// Create a project via the UI.
		const projectName = `${adminProjectsPage.workerPrefix} Delete Me ${randomUUID()}`;
		await adminProjectsPage.gotoCreate();
		await adminProjectsPage.fillName(projectName);
		await adminProjectsPage.selectFirstScope();
		await adminProjectsPage.fillDatePicker("Start date", 2024, 1, 15);
		await adminProjectsPage.fillSummary("E2E test project to be deleted");
		await adminProjectsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await adminProjectsPage.fillDescription("Description for delete test.");
		await adminProjectsPage.submitForm();

		await expect(adminProjectsPage.projectRowByName(projectName)).toBeVisible();

		// Open the delete dialog and confirm.
		const deleteDialog = await adminProjectsPage.openDeleteDialog(projectName);
		await expect(deleteDialog).toBeVisible();
		await adminProjectsPage.confirmDelete(deleteDialog);

		// The project row should no longer be visible.
		await expect(adminProjectsPage.projectRowByName(projectName)).toBeHidden();
	});
});
