import { expect, test } from "@/e2e/lib/test";

/**
 * Country-report content editing as a national coordinator. Covers the Events tab: a normal
 * save round-trip (values persist), and the server-side guard that rejects a purely numeric
 * `dariahCommissionedEvent` title (`update-country-report-events.schema.ts`).
 *
 * The report is a draft in an open campaign so editing is allowed; it is cleaned up afterwards.
 */
test.describe("country report content (national coordinator)", () => {
	test.describe.configure({ mode: "default" });

	let campaignId: string | null = null;
	let year: number | null = null;
	let slug: string | null = null;

	test.beforeAll(async ({ db }) => {
		year = 3550 + test.info().workerIndex;
		const campaign = await db.createOpenCampaign(year);
		campaignId = campaign.id;

		const country = await db.getCountryOption();
		slug = country.slug;
		await db.createCountryReport({
			campaignId: campaign.id,
			countryDocumentId: country.id,
			status: "draft",
		});
	});

	test.afterAll(async ({ db }) => {
		if (campaignId != null) {
			await db.deleteReportingCampaign(campaignId);
		}
	});

	test("saves event counts and persists them", async ({ page }) => {
		await page.goto(`/en/dashboard/reporting/country-reports/${year!}/${slug!}/edit/events`);

		await page.getByLabel("Small events").fill("4");
		await page.getByLabel("Medium events").fill("2");
		await page.getByRole("button", { name: "Save" }).click();

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
		await page.getByRole("button", { name: "Save" }).click();

		// The schema's `v.check` rejects a purely numeric title; the field error is shown and nothing
		// is persisted (the title field is empty again after a reload).
		await expect(page.getByText("Enter the event title, not a number.")).toBeVisible();

		await page.reload();
		await expect(page.getByLabel("Title")).toHaveValue("");
	});
});
