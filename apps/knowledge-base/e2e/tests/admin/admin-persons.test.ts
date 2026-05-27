import { randomUUID } from "node:crypto";

import { withFailureInjection } from "@/e2e/lib/fixtures/failure-injection";
import { expect, test } from "@/e2e/lib/test";

test.describe("persons admin", () => {
	/**
	 * Run sequentially within this file. Suites may run concurrently because test data is isolated by
	 * Playwright worker index.
	 */
	test.describe.configure({ mode: "default" });

	test.beforeAll(async ({ db }) => {
		/** Verify that global prerequisites exist. */
		await db.getTestAsset();
	});

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerPersons(testInfo.workerIndex);
	});

	test("should create a person", async ({ createAdminPersonsPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const personsPage = createAdminPersonsPage(workerIndex);

		const name = `${personsPage.workerPrefix} Test Person ${randomUUID()}`;
		const sortName = "Person, Test";
		const email = `person-${randomUUID()}@example.com`;
		const orcid = "0000-0002-1825-0097";
		const biography = "E2E test person biography.";
		const testAsset = await db.getTestAsset();

		await personsPage.gotoCreate();

		await personsPage.fillName(name);
		await personsPage.fillSortName(sortName);
		await personsPage.fillEmail(email);
		await personsPage.fillOrcid(orcid);
		await personsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await personsPage.fillBiography(biography);

		await personsPage.submitForm();

		await personsPage.searchByName(name);
		await expect(personsPage.rowByName(name)).toBeVisible();

		const created = await db.getPersonByName(name);
		expect(created).not.toBeNull();
		expect(created).toMatchObject({ email, imageId: testAsset.id, name, orcid, sortName });
		expect(JSON.stringify(await db.getPersonBiographyByName(name))).toContain(biography);
	});

	test("should edit all person form fields", async ({ page, createAdminPersonsPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const personsPage = createAdminPersonsPage(workerIndex);

		const originalName = `${personsPage.workerPrefix} Edit Me ${randomUUID()}`;
		const testAsset = await db.getTestAsset();
		await personsPage.gotoCreate();
		await personsPage.fillName(originalName);
		await personsPage.fillSortName("Me, Edit");
		await personsPage.fillEmail(`edit-${randomUUID()}@example.com`);
		await personsPage.fillOrcid("0000-0002-1825-0097");
		await personsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await personsPage.fillBiography("Description for edit test.");
		await personsPage.submitForm();

		await personsPage.searchByName(originalName);
		const row = personsPage.rowByName(originalName);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await Promise.all([
			page.waitForURL("**/edit"),
			page.getByRole("menuitem", { name: "Edit" }).click(),
		]);

		const updatedName = `${personsPage.workerPrefix} Updated ${randomUUID()}`;
		const updatedSortName = "Updated, Person";
		const updatedEmail = `updated-${randomUUID()}@example.com`;
		const updatedOrcid = "0000-0003-1415-9265";
		const updatedBiography = "Updated E2E test person biography.";

		await page.getByLabel("Name", { exact: true }).fill(updatedName);
		await personsPage.fillSortName(updatedSortName);
		await personsPage.fillEmail(updatedEmail);
		await personsPage.fillOrcid(updatedOrcid);
		await personsPage.selectImageFromMediaLibrary("E2E Test Asset");
		const biographyEditor = page.getByRole("textbox", { name: "Biography" });
		await biographyEditor.click();
		await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
		await page.keyboard.type(updatedBiography);

		await personsPage.submitForm();

		await personsPage.searchByName(updatedName);
		await expect(personsPage.rowByName(updatedName)).toBeVisible();
		await personsPage.searchByName(originalName);
		await expect(personsPage.rowByName(originalName)).toBeHidden();

		const updated = await db.getPersonByName(updatedName);
		expect(updated).not.toBeNull();
		expect(updated).toMatchObject({
			email: updatedEmail,
			imageId: testAsset.id,
			name: updatedName,
			orcid: updatedOrcid,
			sortName: updatedSortName,
		});
		expect(JSON.stringify(await db.getPersonBiographyByName(updatedName))).toContain(
			updatedBiography,
		);
	});

	test("failure injection forces createServerAction to return an error state", async ({
		page,
		createAdminPersonsPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const personsPage = createAdminPersonsPage(workerIndex);

		const name = `${personsPage.workerPrefix} FailureInjection ${randomUUID()}`;

		await personsPage.gotoCreate();
		await personsPage.fillName(name);
		await personsPage.fillSortName("FailureInjection, Person");
		await personsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await personsPage.fillBiography("Failure injection biography.");

		await withFailureInjection(page, async () => {
			await page.getByRole("button", { name: /^Save(?! and publish\b).*$/ }).click();
			/** Action returns error state; URL stays on the create page. */
			await expect(page).toHaveURL(/\/dashboard\/administrator\/persons\/create$/);
			await expect(page.getByText("Internal server error.")).toBeVisible();
		});

		/** Sanity check: nothing was persisted. */
		await personsPage.goto();
		await personsPage.searchByName(name);
		await expect(personsPage.rowByName(name)).toBeHidden();
	});

	test("should delete a person", async ({ createAdminPersonsPage }) => {
		const workerIndex = test.info().workerIndex;
		const personsPage = createAdminPersonsPage(workerIndex);

		const name = `${personsPage.workerPrefix} Delete Me ${randomUUID()}`;
		await personsPage.gotoCreate();
		await personsPage.fillName(name);
		await personsPage.fillSortName("Me, Delete");
		await personsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await personsPage.fillBiography("Description for delete test.");
		await personsPage.submitForm();

		await personsPage.searchByName(name);
		await expect(personsPage.rowByName(name)).toBeVisible();

		const deleteDialog = await personsPage.openDeleteDialog(name);
		await expect(deleteDialog).toBeVisible();
		await personsPage.confirmDelete(deleteDialog);

		await expect(personsPage.rowByName(name)).toBeHidden();
	});
});
