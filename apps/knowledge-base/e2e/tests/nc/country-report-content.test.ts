import type { Locator, Page } from "@playwright/test";

import { waitForActionSuccess } from "@/e2e/lib/fixtures/action-success";
import { expect, test } from "@/e2e/lib/test";

/**
 * Country-report content editing as a national coordinator. Covers the Events tab: a normal save
 * round-trip (values persist), and the server-side guard that rejects a purely numeric
 * `dariahCommissionedEvent` title (`update-country-report-events.schema.ts`). Also covers services,
 * and creating a (draft) project from the Projects tab and reporting a contribution to it.
 *
 * The report is a draft in an open campaign so editing is allowed; it is cleaned up afterwards.
 */

/** The events content form, scoped away from the screen's comment form (which has its own "Save"). */
function eventsForm(page: Page): Locator {
	return page.locator("form").filter({ has: page.getByLabel("Small events") });
}

test.describe("country report content (national coordinator)", () => {
	test.describe.configure({ mode: "default" });

	let campaignId: string | null = null;
	let reportId: string | null = null;
	let year: number | null = null;
	let slug: string | null = null;

	test.beforeAll(async ({ db }) => {
		year = 3550 + test.info().workerIndex;
		const campaign = await db.createOpenCampaign(year);
		campaignId = campaign.id;

		const country = await db.getCountryOption();
		slug = country.slug;
		const report = await db.createCountryReport({
			campaignId: campaign.id,
			countryDocumentId: country.id,
			status: "draft",
		});
		reportId = report.id;
	});

	test.afterAll(async ({ db }) => {
		if (campaignId != null) {
			await db.deleteReportingCampaign(campaignId);
		}
		// After the campaign: its project contributions reference the projects created here.
		await db.cleanupWorkerProjects(test.info().workerIndex);
	});

	test("saves event counts and persists them", async ({ page }) => {
		await page.goto(`/en/dashboard/reporting/country-reports/${year!}/${slug!}/edit/events`);

		await page.getByLabel("Small events").fill("4");
		await page.getByLabel("Medium events").fill("2");
		// Scope to the events form: the screen also renders a comment section with its own "Save". Wait
		// for the (non-redirecting) save action to finish before reloading, otherwise the reload aborts
		// the in-flight POST and nothing is persisted.
		await waitForActionSuccess({
			page,
			trigger: async () => {
				await eventsForm(page).getByRole("button", { name: "Save" }).click();
			},
		});

		// Stays on the editor (a successful content save does not redirect) and the values survive a
		// reload — i.e. they were persisted to the report.
		await expect(page.getByLabel("Small events")).toHaveValue("4");

		await page.reload();
		await expect(page.getByLabel("Small events")).toHaveValue("4");
		await expect(page.getByLabel("Medium events")).toHaveValue("2");
	});

	test("rejects a numeric DARIAH-commissioned event title", async ({ page }) => {
		await page.goto(`/en/dashboard/reporting/country-reports/${year!}/${slug!}/edit/events`);

		await page.getByLabel("Title").fill("123");
		await eventsForm(page).getByRole("button", { name: "Save" }).click();

		// The schema's `v.check` rejects a purely numeric title; the field error is shown and nothing
		// is persisted (the title field is empty again after a reload).
		await expect(page.getByText("Enter the event title, not a number.")).toBeVisible();

		await page.reload();
		await expect(page.getByLabel("Title")).toHaveValue("");
	});

	test("adds and removes a curated service membership", async ({ db, page }) => {
		await page.goto(`/en/dashboard/reporting/country-reports/${year!}/${slug!}/edit/services`);

		// The service picker is searchable; ArrowDown opens the full list without typing a query.
		await page.getByRole("combobox", { name: "Service" }).press("ArrowDown");
		const option = page.getByRole("option").first();
		const serviceName = await option.textContent();
		expect(serviceName).not.toBeNull();
		await option.click();
		await page.getByRole("button", { name: "Add", exact: true }).click();

		// Assert against the membership card, not the page: the picker keeps the selected service in its
		// search input, which would otherwise also match the name.
		const serviceCard = page.getByRole("listitem").filter({ hasText: serviceName! });
		await expect(serviceCard).toBeVisible();
		expect(await db.getCountryReportServiceIds(reportId!)).toHaveLength(1);

		await page.getByRole("button", { name: "Remove service" }).click();
		await expect(serviceCard).toHaveCount(0);
		expect(await db.getCountryReportServiceIds(reportId!)).toHaveLength(0);
	});

	test("creates a draft project and reports a contribution to it", async ({ db, page }) => {
		const name = `[e2e-worker-${String(test.info().workerIndex)}] Reported project ${String(Date.now())}`;

		await page.goto(`/en/dashboard/reporting/country-reports/${year!}/${slug!}/edit/projects`);

		// Create the project in the side sheet; it is selected in the project picker afterwards.
		await page.getByRole("button", { name: "Create new project" }).click();
		const dialog = page.getByRole("dialog", { name: "Create new project" });
		await dialog.getByLabel("Name", { exact: true }).fill(name);
		const scopeControl = dialog
			.locator('[data-slot="control"]')
			.filter({ has: page.getByText("Scope", { exact: true }) });
		await scopeControl.locator("button").click();
		await page.getByRole("option").first().click();
		const startDate = dialog.getByRole("group", { name: "Start date" });
		await startDate.getByRole("spinbutton", { name: /day/i }).click();
		await page.keyboard.type("01");
		await startDate.getByRole("spinbutton", { name: /month/i }).click();
		await page.keyboard.type("01");
		await startDate.getByRole("spinbutton", { name: /year/i }).click();
		await page.keyboard.type("2020");
		await dialog.getByRole("button", { name: "Create project" }).click();
		await dialog.waitFor({ state: "hidden" });

		const project = await db.getProjectByName(name);
		expect(project, "the created project exists").not.toBeNull();
		// Created from a report, the project is never published.
		expect(await db.getPublishedVersionId(project!.documentId)).toBeNull();

		await expect(page.getByRole("combobox", { name: "Project" })).toHaveValue(name);
		await page.getByLabel("Total funding amount").fill("2500");
		await waitForActionSuccess({
			page,
			trigger: async () => {
				await page.getByRole("button", { name: "Add", exact: true }).click();
			},
		});

		const contribution = page.getByRole("listitem").filter({ hasText: name });
		await expect(contribution).toBeVisible();
		await expect(contribution.getByText("Draft", { exact: true })).toBeVisible();
		expect(
			await db.getCountryReportProjectContributionByProjectDocumentId(project!.documentId),
		).not.toBeNull();
	});
});
