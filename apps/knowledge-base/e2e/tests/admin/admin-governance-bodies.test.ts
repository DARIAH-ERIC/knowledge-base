import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("governance bodies admin", () => {
	/**
	 * Run sequentially within this file. Suites may run concurrently because test data is isolated by
	 * Playwright worker index.
	 */
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerGovernanceBodies(testInfo.workerIndex);
	});

	test("should create a governance body", async ({ createAdminGovernanceBodiesPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const governanceBodiesPage = createAdminGovernanceBodiesPage(workerIndex);

		const name = `${governanceBodiesPage.workerPrefix} Test GB ${randomUUID()}`;
		const acronym = "E2EGB";
		const summary = "E2E test governance body summary.";
		const description = "E2E test governance body description.";
		const testAsset = await db.getTestAsset();

		await governanceBodiesPage.gotoCreate();

		await governanceBodiesPage.fillName(name);
		await governanceBodiesPage.fillAcronym(acronym);
		await governanceBodiesPage.fillSummary(summary);
		await governanceBodiesPage.selectTestImage();
		await governanceBodiesPage.fillDescription(description);

		await governanceBodiesPage.submitForm();

		await governanceBodiesPage.searchByName(name);
		await expect(governanceBodiesPage.rowByName(name)).toBeVisible();

		const created = await db.getGovernanceBodyByName(name);
		expect(created).not.toBeNull();
		expect(created).toMatchObject({ acronym, imageId: testAsset.id, name, summary });
		expect(JSON.stringify(await db.getGovernanceBodyDescriptionByName(name))).toContain(
			description,
		);
	});

	test("should edit all governance body form fields", async ({
		page,
		createAdminGovernanceBodiesPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const governanceBodiesPage = createAdminGovernanceBodiesPage(workerIndex);
		const testAsset = await db.getTestAsset();

		const originalName = `${governanceBodiesPage.workerPrefix} Edit Me ${randomUUID()}`;
		await governanceBodiesPage.gotoCreate();
		await governanceBodiesPage.fillName(originalName);
		await governanceBodiesPage.fillAcronym("E2EGBOLD");
		await governanceBodiesPage.fillSummary("E2E test governance body to be edited.");
		await governanceBodiesPage.fillDescription("Description for edit test.");
		await governanceBodiesPage.submitForm();

		await governanceBodiesPage.searchByName(originalName);
		const row = governanceBodiesPage.rowByName(originalName);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await Promise.all([
			page.waitForURL("**/edit"),
			page.getByRole("menuitem", { name: "Edit" }).click(),
		]);

		const updatedName = `${governanceBodiesPage.workerPrefix} Updated ${randomUUID()}`;
		const updatedAcronym = "E2EGBNEW";
		const updatedSummary = "Updated E2E test governance body summary.";
		const updatedDescription = "Updated E2E test governance body description.";

		await page.getByLabel("Name", { exact: true }).fill(updatedName);
		await governanceBodiesPage.fillAcronym(updatedAcronym);
		await governanceBodiesPage.fillSummary(updatedSummary);
		await governanceBodiesPage.selectTestImage();
		const descriptionEditor = page.getByRole("textbox", { name: "Description" });
		await descriptionEditor.click();
		await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
		await page.keyboard.type(updatedDescription);

		await governanceBodiesPage.submitForm();

		await governanceBodiesPage.searchByName(updatedName);
		await expect(governanceBodiesPage.rowByName(updatedName)).toBeVisible();
		await governanceBodiesPage.searchByName(originalName);
		await expect(governanceBodiesPage.rowByName(originalName)).toBeHidden();

		const updated = await db.getGovernanceBodyByName(updatedName);
		expect(updated).not.toBeNull();
		expect(updated).toMatchObject({
			acronym: updatedAcronym,
			imageId: testAsset.id,
			name: updatedName,
			summary: updatedSummary,
		});
		expect(JSON.stringify(await db.getGovernanceBodyDescriptionByName(updatedName))).toContain(
			updatedDescription,
		);
	});

	test("should clear optional governance body fields", async ({
		page,
		createAdminGovernanceBodiesPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const governanceBodiesPage = createAdminGovernanceBodiesPage(workerIndex);
		const originalName = `${governanceBodiesPage.workerPrefix} Clear Optional ${randomUUID()}`;

		await governanceBodiesPage.gotoCreate();
		await governanceBodiesPage.fillName(originalName);
		await governanceBodiesPage.fillAcronym("E2EGBOPT");
		await governanceBodiesPage.fillSummary("Optional governance body summary.");
		await governanceBodiesPage.selectTestImage();
		await governanceBodiesPage.fillDescription("Required description for clear test.");
		await governanceBodiesPage.submitForm();

		await governanceBodiesPage.searchByName(originalName);
		const row = governanceBodiesPage.rowByName(originalName);
		await row.getByRole("button", { name: "Open actions menu" }).click();
		await Promise.all([
			page.waitForURL("**/edit"),
			page.getByRole("menuitem", { name: "Edit" }).click(),
		]);

		const updatedName = `${governanceBodiesPage.workerPrefix} Cleared ${randomUUID()}`;
		await page.getByLabel("Name", { exact: true }).fill(updatedName);
		await governanceBodiesPage.fillAcronym("");
		await governanceBodiesPage.fillSummary("");
		await governanceBodiesPage.removeImage();
		await governanceBodiesPage.submitForm();

		const updated = await db.getGovernanceBodyByName(updatedName);
		expect(updated).toMatchObject({ acronym: null, imageId: null, summary: null });
	});

	test("should delete a governance body", async ({ createAdminGovernanceBodiesPage }) => {
		const workerIndex = test.info().workerIndex;
		const governanceBodiesPage = createAdminGovernanceBodiesPage(workerIndex);

		const name = `${governanceBodiesPage.workerPrefix} Delete Me ${randomUUID()}`;
		await governanceBodiesPage.gotoCreate();
		await governanceBodiesPage.fillName(name);
		await governanceBodiesPage.fillDescription("Description for delete test.");
		await governanceBodiesPage.submitForm();

		await governanceBodiesPage.searchByName(name);
		await expect(governanceBodiesPage.rowByName(name)).toBeVisible();

		const deleteDialog = await governanceBodiesPage.openDeleteDialog(name);
		await expect(deleteDialog).toBeVisible();
		await governanceBodiesPage.confirmDelete(deleteDialog);

		await expect(governanceBodiesPage.rowByName(name)).toBeHidden();
	});
});
