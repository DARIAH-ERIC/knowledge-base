import { expect, test } from "@/e2e/lib/test";

/**
 * Working-group-report lifecycle as a chair (the `wgchair` persona — see `seedReportingPersonas`).
 * Mirrors the country-report lifecycle: a chair may submit a `draft` report in an `open` campaign
 * (draft -> submitted), there is no re-submit, and content editing is frozen afterwards
 * (`assertReportEditable` redirects to `/dashboard`).
 */
test.describe("working group report lifecycle (chair)", () => {
	test.describe.configure({ mode: "default" });

	let campaignId: string | null = null;
	let reportId: string | null = null;
	let year: number | null = null;
	let slug: string | null = null;

	test.beforeAll(async ({ db }) => {
		year = 3700 + test.info().workerIndex;
		const campaign = await db.createOpenCampaign(year);
		campaignId = campaign.id;

		const workingGroup = await db.getWorkingGroupOption();
		slug = workingGroup.slug;
		const report = await db.createWorkingGroupReport({
			campaignId: campaign.id,
			workingGroupDocumentId: workingGroup.id,
			status: "draft",
		});
		reportId = report.id;
	});

	test.afterAll(async ({ db }) => {
		if (campaignId != null) {
			await db.deleteReportingCampaign(campaignId);
		}
	});

	test("a chair submits a draft report", async ({ page, db }) => {
		await page.goto(`/en/dashboard/reporting/working-group-reports/${year!}/${slug!}/edit/summary`);

		const submitButton = page.getByRole("button", { name: "Submit report" });
		await expect(submitButton).toBeVisible();

		await submitButton.click();
		const dialog = page.getByRole("alertdialog", { name: "Submit this report?" });
		await dialog.getByRole("button", { name: "Submit report" }).click();
		// Wait out the dialog's exit animation: until then its "Submit report" button also matches.
		await expect(dialog).toBeHidden();

		// The submitted report is view-only for the chair, so the redirect after submitting lands on the
		// report itself, which has no re-submit affordance.
		await expect(page).toHaveURL(`/en/dashboard/reporting/working-group-reports/${year!}/${slug!}`);
		await expect(page.getByRole("button", { name: "Submit report" })).toBeHidden();
		await expect(page.getByText(`Campaign ${year!} · Submitted`)).toBeVisible();

		const updated = await db.getWorkingGroupReportById(reportId!);
		expect(updated).toMatchObject({ status: "submitted" });
	});

	test("editing is frozen once the report is submitted", async ({ page }) => {
		await page.goto(`/en/dashboard/reporting/working-group-reports/${year!}/${slug!}/edit/data`);

		// A typed edit URL of a submitted report redirects to the report itself: no edit forms, but
		// comments can still be added there.
		await expect(page).toHaveURL(`/en/dashboard/reporting/working-group-reports/${year!}/${slug!}`);
		await expect(page.getByLabel("Number of members")).toHaveCount(0);
		await expect(page.getByRole("textbox", { name: "Data", exact: true })).toBeVisible();
	});
});
