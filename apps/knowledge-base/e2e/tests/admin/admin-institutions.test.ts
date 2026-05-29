import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("institutions admin", () => {
	/**
	 * Run sequentially within this file. Suites may run concurrently because test data is isolated by
	 * Playwright worker index.
	 */
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerInstitutions(testInfo.workerIndex);
	});

	test("should create an institution", async ({ createAdminInstitutionsPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const institutionsPage = createAdminInstitutionsPage(workerIndex);

		const name = `${institutionsPage.workerPrefix} Test Institution ${randomUUID()}`;
		const acronym = "E2EI";
		const ror = "https://ror.org/05n09v162";
		const summary = "E2E test institution summary.";
		const description = "E2E test institution description.";
		const testAsset = await db.getTestAsset();

		await institutionsPage.gotoCreate();

		await institutionsPage.fillName(name);
		await institutionsPage.fillAcronym(acronym);
		await institutionsPage.fillRor(ror);
		await institutionsPage.fillSummary(summary);
		await institutionsPage.selectTestImage();
		await institutionsPage.fillDescription(description);

		await institutionsPage.submitForm();

		await institutionsPage.searchByName(name);
		await expect(institutionsPage.rowByName(name)).toBeVisible();

		const created = await db.getInstitutionByName(name);
		expect(created).not.toBeNull();
		expect(created).toMatchObject({ acronym, imageId: testAsset.id, name, ror, summary });
		expect(JSON.stringify(await db.getInstitutionDescriptionByName(name))).toContain(description);
	});

	test("should edit all institution form fields", async ({
		page,
		createAdminInstitutionsPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const institutionsPage = createAdminInstitutionsPage(workerIndex);
		const testAsset = await db.getTestAsset();

		const originalName = `${institutionsPage.workerPrefix} Edit Me ${randomUUID()}`;
		await institutionsPage.gotoCreate();
		await institutionsPage.fillName(originalName);
		await institutionsPage.fillRor("https://ror.org/05n09v162");
		await institutionsPage.fillDescription("Description for edit test.");
		await institutionsPage.submitForm();

		await institutionsPage.searchByName(originalName);
		const row = institutionsPage.rowByName(originalName);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await Promise.all([
			page.waitForURL("**/edit"),
			page.getByRole("menuitem", { name: "Edit" }).click(),
		]);

		const updatedName = `${institutionsPage.workerPrefix} Updated ${randomUUID()}`;
		const updatedAcronym = "E2EIUPD";
		const updatedRor = "https://ror.org/0abcdef12";
		const updatedSummary = "Updated E2E test institution summary.";
		const updatedDescription = "Updated E2E test institution description.";

		await page.getByLabel("Name", { exact: true }).fill(updatedName);
		await institutionsPage.fillAcronym(updatedAcronym);
		await institutionsPage.fillRor(updatedRor);
		await institutionsPage.fillSummary(updatedSummary);
		await institutionsPage.selectTestImage();
		const descriptionEditor = page.getByRole("textbox", { name: "Description" });
		await descriptionEditor.click();
		await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
		await page.keyboard.type(updatedDescription);

		await institutionsPage.submitForm();

		await institutionsPage.searchByName(updatedName);
		await expect(institutionsPage.rowByName(updatedName)).toBeVisible();
		await institutionsPage.searchByName(originalName);
		await expect(institutionsPage.rowByName(originalName)).toBeHidden();

		const updated = await db.getInstitutionByName(updatedName);
		expect(updated).not.toBeNull();
		expect(updated).toMatchObject({
			acronym: updatedAcronym,
			imageId: testAsset.id,
			name: updatedName,
			ror: updatedRor,
			summary: updatedSummary,
		});
		expect(JSON.stringify(await db.getInstitutionDescriptionByName(updatedName))).toContain(
			updatedDescription,
		);
	});

	test("should clear optional institution fields", async ({
		page,
		createAdminInstitutionsPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const institutionsPage = createAdminInstitutionsPage(workerIndex);

		const originalName = `${institutionsPage.workerPrefix} Clear Optional ${randomUUID()}`;
		await institutionsPage.gotoCreate();
		await institutionsPage.fillName(originalName);
		await institutionsPage.fillAcronym("E2EIOPT");
		await institutionsPage.fillRor("https://ror.org/05n09v162");
		await institutionsPage.fillSummary("Optional institution summary.");
		await institutionsPage.selectTestImage();
		await institutionsPage.fillDescription("Required description for clear test.");
		await institutionsPage.submitForm();

		await institutionsPage.searchByName(originalName);
		const row = institutionsPage.rowByName(originalName);
		await row.getByRole("button", { name: "Open actions menu" }).click();
		await Promise.all([
			page.waitForURL("**/edit"),
			page.getByRole("menuitem", { name: "Edit" }).click(),
		]);

		const updatedName = `${institutionsPage.workerPrefix} Cleared ${randomUUID()}`;
		await page.getByLabel("Name", { exact: true }).fill(updatedName);
		await institutionsPage.fillAcronym("");
		await institutionsPage.fillRor("");
		await institutionsPage.fillSummary("");
		await institutionsPage.removeImage();

		await institutionsPage.submitForm();

		const updated = await db.getInstitutionByName(updatedName);
		expect(updated).toMatchObject({ acronym: null, imageId: null, ror: null, summary: null });
	});

	test("should delete an institution", async ({ createAdminInstitutionsPage }) => {
		const workerIndex = test.info().workerIndex;
		const institutionsPage = createAdminInstitutionsPage(workerIndex);

		const name = `${institutionsPage.workerPrefix} Delete Me ${randomUUID()}`;
		await institutionsPage.gotoCreate();
		await institutionsPage.fillName(name);
		await institutionsPage.fillDescription("Description for delete test.");
		await institutionsPage.submitForm();

		await institutionsPage.searchByName(name);
		await expect(institutionsPage.rowByName(name)).toBeVisible();

		const deleteDialog = await institutionsPage.openDeleteDialog(name);
		await expect(deleteDialog).toBeVisible();
		await institutionsPage.confirmDelete(deleteDialog);

		await expect(institutionsPage.rowByName(name)).toBeHidden();
	});
});
