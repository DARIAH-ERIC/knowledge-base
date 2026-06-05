import { randomUUID } from "node:crypto";

import type { Locator, Page } from "@playwright/test";

import { waitForActionSuccess } from "@/e2e/lib/fixtures/action-success";
import { fillSearchAndWaitForUrl } from "@/e2e/lib/fixtures/search";
import { expect, test } from "@/e2e/lib/test";

function rowByText(page: Page, text: string): Locator {
	return page.getByRole("row").filter({ hasText: text });
}

async function fillDatePicker(
	page: Page,
	scope: Page | Locator,
	label: string,
	year: number,
	month: number,
	day: number,
): Promise<void> {
	const group = scope.getByRole("group", { name: label });
	await group.getByRole("spinbutton", { name: /day/i }).click();
	await page.keyboard.type(String(day).padStart(2, "0"));
	await group.getByRole("spinbutton", { name: /month/i }).click();
	await page.keyboard.type(String(month).padStart(2, "0"));
	await group.getByRole("spinbutton", { name: /year/i }).click();
	await page.keyboard.type(String(year));
}

async function openRowAction(page: Page, rowText: string, action: string): Promise<void> {
	const row = rowByText(page, rowText);
	await row.getByRole("button", { name: "Open actions menu" }).click();
	await page.getByRole("menuitem", { name: action }).click();
}

async function saveRelationDialog(page: Page): Promise<void> {
	const dialog = page.getByRole("dialog", { name: "Edit relation" });
	await waitForActionSuccess({
		page,
		trigger: async () => {
			await dialog.getByRole("button", { name: "Save" }).click();
		},
	});
	await dialog.waitFor({ state: "hidden" });
}

async function confirmDeleteDialog(page: Page, name: RegExp): Promise<void> {
	const dialog = page.getByRole("dialog", { name });
	await dialog.getByRole("button", { name: "Delete" }).click();
	await dialog.waitFor({ state: "hidden" });
}

test.describe("admin relation management", () => {
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerProjects(testInfo.workerIndex);
		await db.cleanupWorkerInstitutions(testInfo.workerIndex);
		await db.cleanupWorkerGovernanceBodies(testInfo.workerIndex);
		await db.cleanupWorkerWorkingGroups(testInfo.workerIndex);
		await db.cleanupWorkerPersons(testInfo.workerIndex);
	});

	test("should edit and delete a person relation from the standalone list", async ({
		page,
		createAdminGovernanceBodiesPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const governanceBodiesPage = createAdminGovernanceBodiesPage(workerIndex);
		const name = `${governanceBodiesPage.workerPrefix} Person Relation List ${randomUUID()}`;

		await governanceBodiesPage.gotoCreate();
		await governanceBodiesPage.fillName(name);
		await governanceBodiesPage.fillDescription("Description for person relation list test.");
		await governanceBodiesPage.submitForm();

		await governanceBodiesPage.gotoEditFromList(name);
		await governanceBodiesPage.goToPeopleTab();
		await governanceBodiesPage.selectFirstPersonRole();
		await governanceBodiesPage.selectFirstPerson();
		await governanceBodiesPage.fillPersonRelationDatePicker("Start date", 2025, 1, 1);
		await governanceBodiesPage.submitAddPerson();

		const governanceBody = await db.getGovernanceBodyByName(name);
		expect(await db.getPersonRelationsByUnitVersionId(governanceBody!.id)).toHaveLength(1);

		const listPath = "/en/dashboard/administrator/person-relations";
		await page.goto(listPath);
		await fillSearchAndWaitForUrl(page, listPath, name);
		await expect(rowByText(page, name)).toBeVisible();

		await openRowAction(page, name, "Edit relation");
		const editDialog = page.getByRole("dialog", { name: "Edit relation" });
		await fillDatePicker(page, editDialog, "End date", 2025, 6, 30);
		await saveRelationDialog(page);

		// Gate the DB read on the refreshed list reflecting the new end date, so we only query once the
		// action has actually committed (and not on a dialog that closed for any other reason).
		await expect(rowByText(page, name)).toContainText("30/06/2025");

		let relations = await db.getPersonRelationsByUnitVersionId(governanceBody!.id);
		expect(relations[0]!.duration.end).toStrictEqual(new Date("2025-06-30T00:00:00.000Z"));

		await openRowAction(page, name, "Delete");
		await confirmDeleteDialog(page, /Delete person relation/i);
		await expect(rowByText(page, name)).toBeHidden();

		relations = await db.getPersonRelationsByUnitVersionId(governanceBody!.id);
		expect(relations).toHaveLength(0);
	});

	test("should edit and delete an institution relation from the standalone list", async ({
		page,
		createAdminInstitutionsPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const institutionsPage = createAdminInstitutionsPage(workerIndex);
		const name = `${institutionsPage.workerPrefix} Institution Relation List ${randomUUID()}`;

		await institutionsPage.gotoCreate();
		await institutionsPage.fillName(name);
		await institutionsPage.fillDescription("Description for institution relation list test.");
		await institutionsPage.submitForm();

		await institutionsPage.gotoEditFromList(name);
		await institutionsPage.goToRelationsTab();
		await institutionsPage.selectFirstRelationType();
		await institutionsPage.selectFirstRelatedUnit();
		await institutionsPage.fillRelationDatePicker("Start date", 2025, 1, 1);
		await institutionsPage.submitAddRelation();

		const institution = await db.getInstitutionByName(name);
		expect(await db.getUnitRelationsByUnitVersionId(institution!.id)).toHaveLength(1);

		const listPath = "/en/dashboard/administrator/institution-relations";
		await page.goto(listPath);
		await fillSearchAndWaitForUrl(page, listPath, name);
		await expect(rowByText(page, name)).toBeVisible();

		await openRowAction(page, name, "Edit relation");
		const editDialog = page.getByRole("dialog", { name: "Edit relation" });
		await fillDatePicker(page, editDialog, "End date", 2025, 6, 30);
		await saveRelationDialog(page);

		// Gate the DB read on the refreshed list reflecting the new end date, so we only query once the
		// action has actually committed (and not on a dialog that closed for any other reason).
		await expect(rowByText(page, name)).toContainText("30/06/2025");

		let relations = await db.getUnitRelationsByUnitVersionId(institution!.id);
		expect(relations[0]!.duration.end).toStrictEqual(new Date("2025-06-30T00:00:00.000Z"));

		await openRowAction(page, name, "Delete");
		await confirmDeleteDialog(page, /Delete institution relation/i);
		await expect(rowByText(page, name)).toBeHidden();

		relations = await db.getUnitRelationsByUnitVersionId(institution!.id);
		expect(relations).toHaveLength(0);
	});

	test("should manage project partners from the project tab and standalone list", async ({
		page,
		createAdminProjectsPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const projectsPage = createAdminProjectsPage(workerIndex);
		const projectName = `${projectsPage.workerPrefix} Partner List ${randomUUID()}`;
		const [partnerUnit] = await db.getOrganisationalUnitOptions(1);
		expect(partnerUnit).toBeDefined();

		await projectsPage.gotoCreate();
		await projectsPage.fillName(projectName);
		await projectsPage.selectFirstScope();
		await projectsPage.fillDatePicker("Start date", 2024, 1, 15);
		await projectsPage.fillSummary("Project partner relation list test.");
		await projectsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await projectsPage.fillDescription("Description for project partner list test.");
		await projectsPage.submitForm();

		await projectsPage.searchByName(projectName);
		const projectRow = projectsPage.projectRowByName(projectName);
		await expect(projectRow).toBeVisible();
		await projectRow.getByRole("button", { name: "Open actions menu" }).click();
		await Promise.all([
			page.waitForURL("**/edit"),
			page.getByRole("menuitem", { name: "Edit" }).click(),
		]);

		await projectsPage.goToProjectPartnersTab();
		await projectsPage.addProjectPartner(partnerUnit!.name);

		let relations = await db.getProjectRelationsByName(projectName);
		expect(relations?.partners).toHaveLength(1);
		expect(relations?.partners[0]).toStrictEqual(
			expect.objectContaining({
				duration: {
					start: new Date("2024-03-01T00:00:00.000Z"),
					end: new Date("2024-09-30T00:00:00.000Z"),
				},
				unitId: partnerUnit!.id,
			}),
		);

		await projectsPage.clickEditProjectPartner();
		await projectsPage.fillProjectPartnerEditDate("End date", 2025, 5, 31);
		await projectsPage.saveProjectPartnerEdit();

		relations = await db.getProjectRelationsByName(projectName);
		expect(relations?.partners[0]!.duration?.end).toStrictEqual(
			new Date("2025-05-31T00:00:00.000Z"),
		);

		const listPath = "/en/dashboard/administrator/project-partners";
		await page.goto(listPath);
		await fillSearchAndWaitForUrl(page, listPath, projectName);
		await expect(rowByText(page, projectName)).toBeVisible();

		await openRowAction(page, projectName, "Edit partner");
		const editDialog = page.getByRole("dialog", { name: "Edit partner" });
		await fillDatePicker(page, editDialog, "End date", 2025, 6, 30);
		await waitForActionSuccess({
			page,
			trigger: async () => {
				await editDialog.getByRole("button", { name: "Save" }).click();
			},
		});
		await editDialog.waitFor({ state: "hidden" });

		// Gate the DB read on the refreshed list reflecting the new end date, so we only query once the
		// action has actually committed (and not on a dialog that closed for any other reason).
		await expect(rowByText(page, projectName)).toContainText("30/06/2025");

		relations = await db.getProjectRelationsByName(projectName);
		expect(relations?.partners[0]!.duration?.end).toStrictEqual(
			new Date("2025-06-30T00:00:00.000Z"),
		);

		await Promise.all([
			page.waitForURL("**/edit"),
			openRowAction(page, projectName, "Edit project"),
		]);
		await projectsPage.goToProjectPartnersTab();
		await projectsPage.clickDeleteProjectPartner();
		await projectsPage.confirmDeleteProjectPartner();
		await expect(projectsPage.projectPartnersTable()).toBeHidden();
		await expect(page.getByText("No project partners.")).toBeVisible();

		relations = await db.getProjectRelationsByName(projectName);
		expect(relations?.partners).toHaveLength(0);

		await projectsPage.addProjectPartner(partnerUnit!.name);
		relations = await db.getProjectRelationsByName(projectName);
		expect(relations?.partners).toHaveLength(1);

		await page.goto(listPath);
		await fillSearchAndWaitForUrl(page, listPath, projectName);
		await expect(rowByText(page, projectName)).toBeVisible();
		await openRowAction(page, projectName, "Delete");
		await confirmDeleteDialog(page, /Delete project partner/i);
		await expect(rowByText(page, projectName)).toBeHidden();

		relations = await db.getProjectRelationsByName(projectName);
		expect(relations?.partners).toHaveLength(0);
	});

	test("should edit and delete a unit relation from the relation tab", async ({
		createAdminGovernanceBodiesPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const governanceBodiesPage = createAdminGovernanceBodiesPage(workerIndex);
		const name = `${governanceBodiesPage.workerPrefix} Relation Tab Actions ${randomUUID()}`;

		await governanceBodiesPage.gotoCreate();
		await governanceBodiesPage.fillName(name);
		await governanceBodiesPage.fillDescription("Description for relation tab action test.");
		await governanceBodiesPage.submitForm();

		await governanceBodiesPage.gotoEditFromList(name);
		await governanceBodiesPage.goToRelationsTab();
		await governanceBodiesPage.selectFirstRelationType();
		await governanceBodiesPage.selectFirstRelatedUnit();
		await governanceBodiesPage.fillRelationDatePicker("Start date", 2025, 1, 1);
		await governanceBodiesPage.submitAddRelation();

		await expect(
			governanceBodiesPage.relationsTable().getByRole("button", { name: "Edit relation" }),
		).toBeVisible();
		await expect(
			governanceBodiesPage.relationsTable().getByRole("button", { name: "Delete relation" }),
		).toBeVisible();

		const governanceBody = await db.getGovernanceBodyByName(name);
		await governanceBodiesPage.clickEditRelation();
		await governanceBodiesPage.fillEditRelationDate("End date", 2025, 6, 30);
		await governanceBodiesPage.saveEditRelation();

		let relations = await db.getUnitRelationsByUnitVersionId(governanceBody!.id);
		expect(relations[0]!.duration.end).toStrictEqual(new Date("2025-06-30T00:00:00.000Z"));

		await governanceBodiesPage.clickDeleteRelation();
		await governanceBodiesPage.confirmDeleteRelation();
		await expect(governanceBodiesPage.relationsTable()).toBeHidden();
		await expect(governanceBodiesPage.page.getByText("No relations.")).toBeVisible();

		relations = await db.getUnitRelationsByUnitVersionId(governanceBody!.id);
		expect(relations).toHaveLength(0);
	});

	test("should edit and delete a person relation from the people tab", async ({
		createAdminGovernanceBodiesPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const governanceBodiesPage = createAdminGovernanceBodiesPage(workerIndex);
		const name = `${governanceBodiesPage.workerPrefix} People Tab Actions ${randomUUID()}`;

		await governanceBodiesPage.gotoCreate();
		await governanceBodiesPage.fillName(name);
		await governanceBodiesPage.fillDescription("Description for people tab action test.");
		await governanceBodiesPage.submitForm();

		await governanceBodiesPage.gotoEditFromList(name);
		await governanceBodiesPage.goToPeopleTab();
		await governanceBodiesPage.selectFirstPersonRole();
		await governanceBodiesPage.selectFirstPerson();
		await governanceBodiesPage.fillPersonRelationDatePicker("Start date", 2025, 1, 1);
		await governanceBodiesPage.submitAddPerson();

		await expect(
			governanceBodiesPage.peopleTable().getByRole("button", { name: "Edit person relation" }),
		).toBeVisible();
		await expect(
			governanceBodiesPage.peopleTable().getByRole("button", { name: "Delete person relation" }),
		).toBeVisible();

		const governanceBody = await db.getGovernanceBodyByName(name);
		await governanceBodiesPage.clickEditPersonRelation();
		await governanceBodiesPage.fillEditPersonRelationDate("End date", 2025, 6, 30);
		await governanceBodiesPage.saveEditPersonRelation();

		let relations = await db.getPersonRelationsByUnitVersionId(governanceBody!.id);
		expect(relations[0]!.duration.end).toStrictEqual(new Date("2025-06-30T00:00:00.000Z"));

		await governanceBodiesPage.clickDeletePersonRelation();
		await governanceBodiesPage.confirmDeletePersonRelation();
		await expect(governanceBodiesPage.peopleTable()).toBeHidden();
		await expect(governanceBodiesPage.page.getByText("No people assigned.")).toBeVisible();

		relations = await db.getPersonRelationsByUnitVersionId(governanceBody!.id);
		expect(relations).toHaveLength(0);
	});

	test("should edit and delete a person relation from the working group people tab", async ({
		createAdminWorkingGroupsPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const workingGroupsPage = createAdminWorkingGroupsPage(workerIndex);
		const name = `${workingGroupsPage.workerPrefix} People Tab Actions ${randomUUID()}`;

		await workingGroupsPage.gotoCreate();
		await workingGroupsPage.fillName(name);
		await workingGroupsPage.fillDescription("Description for people tab action test.");
		await workingGroupsPage.submitForm();

		await workingGroupsPage.gotoEditFromList(name);
		await workingGroupsPage.goToPeopleTab();
		await workingGroupsPage.selectFirstPersonRole();
		await workingGroupsPage.selectFirstPerson();
		await workingGroupsPage.fillPersonRelationDatePicker("Start date", 2025, 1, 1);
		await workingGroupsPage.submitAddPerson();

		await expect(
			workingGroupsPage.peopleTable().getByRole("button", { name: "Edit person relation" }),
		).toBeVisible();
		await expect(
			workingGroupsPage.peopleTable().getByRole("button", { name: "Delete person relation" }),
		).toBeVisible();

		const workingGroup = await db.getWorkingGroupByName(name);
		let relations = await db.getPersonRelationsByUnitVersionId(workingGroup!.id);
		expect(relations).toHaveLength(1);

		await workingGroupsPage.clickEditPersonRelation();
		await workingGroupsPage.fillEditPersonRelationDate("End date", 2025, 6, 30);
		await workingGroupsPage.saveEditPersonRelation();

		relations = await db.getPersonRelationsByUnitVersionId(workingGroup!.id);
		expect(relations[0]!.duration.end).toStrictEqual(new Date("2025-06-30T00:00:00.000Z"));

		await workingGroupsPage.clickDeletePersonRelation();
		await workingGroupsPage.confirmDeletePersonRelation();
		await expect(workingGroupsPage.peopleTable()).toBeHidden();
		await expect(workingGroupsPage.page.getByText("No people assigned.")).toBeVisible();

		relations = await db.getPersonRelationsByUnitVersionId(workingGroup!.id);
		expect(relations).toHaveLength(0);
	});

	/**
	 * Regression test for the date picker assuming the browser's local timezone instead of UTC. In a
	 * timezone ahead of UTC (here Vienna, UTC+1), entering `31/12/2025` used to be converted to
	 * `2025-12-30T23:00:00Z` and therefore both stored and displayed as `30/12/2025`. Dates are
	 * stored as UTC, so the picker must interpret the entered calendar date as UTC midnight.
	 *
	 * This case only reproduces under a non-UTC browser timezone, which the CI runner (UTC) does not
	 * exercise by default — hence the scoped `timezoneId` override below.
	 */
	test.describe("in a non-UTC timezone", () => {
		test.use({ timezoneId: "Europe/Vienna" });

		test("should end a contribution with the entered date", async ({
			createAdminPersonsPage,
			db,
		}) => {
			const workerIndex = test.info().workerIndex;
			const personsPage = createAdminPersonsPage(workerIndex);
			const name = `${personsPage.workerPrefix} Contribution End Date ${randomUUID()}`;

			await personsPage.gotoCreate();
			await personsPage.fillName(name);
			await personsPage.fillSortName("End Date, Person");
			await personsPage.selectImageFromMediaLibrary("E2E Test Asset");
			await personsPage.fillBiography("Biography for contribution end date test.");
			await personsPage.submitForm();

			await personsPage.gotoEditFromList(name);
			await personsPage.goToContributionsTab();
			await personsPage.selectFirstContributionRole();
			await personsPage.selectFirstContributionOrg();
			await personsPage.fillContributionDatePicker("Start date", 2025, 1, 1);
			await personsPage.submitAddContribution();

			await personsPage.clickEndContribution();
			await personsPage.fillEndContributionDate(2025, 12, 31);
			await personsPage.confirmEndContribution();

			// The entered date must be preserved verbatim, not shifted to the previous day.
			await expect(personsPage.contributionsTable()).toContainText("31/12/2025");

			const person = await db.getPersonByName(name);
			const contributions = await db.getContributionsByPersonVersionId(person!.id);
			expect(contributions[0]!.duration.end).toStrictEqual(new Date("2025-12-31T00:00:00.000Z"));
		});
	});

	test("should edit and delete a contribution from the contributions tab", async ({
		createAdminPersonsPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const personsPage = createAdminPersonsPage(workerIndex);
		const name = `${personsPage.workerPrefix} Contributions Tab Actions ${randomUUID()}`;

		await personsPage.gotoCreate();
		await personsPage.fillName(name);
		await personsPage.fillSortName("Tab Actions, Person");
		await personsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await personsPage.fillBiography("Biography for contributions tab action test.");
		await personsPage.submitForm();

		await personsPage.gotoEditFromList(name);
		await personsPage.goToContributionsTab();
		await personsPage.selectFirstContributionRole();
		await personsPage.selectFirstContributionOrg();
		await personsPage.fillContributionDatePicker("Start date", 2025, 1, 1);
		await personsPage.submitAddContribution();

		await expect(
			personsPage.contributionsTable().getByRole("button", { name: "Edit contribution" }),
		).toBeVisible();
		await expect(
			personsPage.contributionsTable().getByRole("button", { name: "Delete contribution" }),
		).toBeVisible();

		const person = await db.getPersonByName(name);
		await personsPage.clickEditContribution();
		await personsPage.fillEditContributionDate("End date", 2025, 6, 30);
		await personsPage.saveEditContribution();

		let contributions = await db.getContributionsByPersonVersionId(person!.id);
		expect(contributions[0]!.duration.end).toStrictEqual(new Date("2025-06-30T00:00:00.000Z"));

		await personsPage.clickDeleteContribution();
		await personsPage.confirmDeleteContribution();
		await expect(personsPage.contributionsTable()).toBeHidden();
		await expect(personsPage.page.getByText("No contributions.")).toBeVisible();

		contributions = await db.getContributionsByPersonVersionId(person!.id);
		expect(contributions).toHaveLength(0);
	});
});
