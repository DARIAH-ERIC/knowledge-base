import { expect, test } from "@/e2e/lib/test";

/**
 * Country-report lifecycle as a national coordinator (the `nc` persona — see
 * `seedReportingPersonas` in global-setup). Pins the server-side state machine hardened in
 * `permissions.ts` + `submit-country-report.action.ts`:
 *
 * - A national coordinator may submit a `draft` report while the campaign is `open` (draft ->
 *   submitted);
 * - Once submitted there is no re-submit (the Submit button is gone);
 * - Editing is frozen after submit — a content mutation redirects to `/dashboard` (the
 *   `assertReportEditable` guard) and persists nothing.
 *
 * Test data is isolated by the worker's own campaign year and cleaned up afterwards.
 */
test.describe("country report lifecycle (national coordinator)", () => {
	test.describe.configure({ mode: "default" });

	let campaignId: string | null = null;
	let reportId: string | null = null;
	let year: number | null = null;
	let slug: string | null = null;

	test.beforeAll(async ({ db }) => {
		year = 3500 + test.info().workerIndex;
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
	});

	test("a coordinator submits a draft report", async ({ page, db }) => {
		await page.goto(`/en/dashboard/reporting/country-reports/${year!}/${slug!}/edit/summary`);

		// The draft is submittable by the coordinator.
		const submitButton = page.getByRole("button", { name: "Submit report" });
		await expect(submitButton).toBeVisible();

		// Submitting asks for confirmation first; cancelling leaves the draft alone.
		await submitButton.click();
		const dialog = page.getByRole("alertdialog", { name: "Submit this report?" });
		await expect(dialog).toBeVisible();
		await dialog.getByRole("button", { name: "Cancel" }).click();
		await expect(dialog).toBeHidden();
		expect(await db.getCountryReportById(reportId!)).toMatchObject({ status: "draft" });

		await submitButton.click();
		await dialog.getByRole("button", { name: "Submit report" }).click();
		// Wait out the dialog's exit animation: until then its "Submit report" button also matches.
		await expect(dialog).toBeHidden();

		// The submitted report is view-only for the coordinator, so the redirect after submitting lands
		// on the report itself, which has no re-submit affordance.
		await expect(page).toHaveURL(`/en/dashboard/reporting/country-reports/${year!}/${slug!}`);
		await expect(page.getByRole("button", { name: "Submit report" })).toBeHidden();
		await expect(page.getByText(`Campaign ${year!} · Submitted`)).toBeVisible();

		const updated = await db.getCountryReportById(reportId!);
		expect(updated).toMatchObject({ status: "submitted" });
	});

	test("editing is frozen once the report is submitted", async ({ page }) => {
		await page.goto(`/en/dashboard/reporting/country-reports/${year!}/${slug!}/edit/events`);

		// A typed edit URL of a submitted report redirects to the report itself: no edit forms (the
		// content mutations' `assertReportEditable` guard would reject a save anyway), but comments can
		// still be added there.
		await expect(page).toHaveURL(`/en/dashboard/reporting/country-reports/${year!}/${slug!}`);
		await expect(page.getByLabel("Small events")).toHaveCount(0);
		await expect(page.getByRole("textbox", { name: "Events", exact: true })).toBeVisible();
	});
});
