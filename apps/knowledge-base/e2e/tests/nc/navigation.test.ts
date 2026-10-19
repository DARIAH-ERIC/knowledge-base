import { clickHydrated } from "@/e2e/lib/fixtures/hydration";
import { expect, test } from "@/e2e/lib/test";

/**
 * Dashboard navigation for a national coordinator (the `nc` persona — see `seedReportingPersonas`
 * in global-setup). The sidebar lists the coordinator's country by name, and the country's page has
 * a Reports tab listing its reports by campaign year. There is no separate reporting section: the
 * current campaign is on the dashboard home, so `/dashboard/reporting` leads there.
 *
 * Test data is isolated by the worker's own campaign year and cleaned up afterwards.
 */
test.describe("national coordinator navigation", () => {
	test.describe.configure({ mode: "default" });

	let campaignId: string | null = null;
	let year: number | null = null;
	let country: { id: string; name: string; slug: string } | null = null;

	test.beforeAll(async ({ db }) => {
		year = 3960 + test.info().workerIndex;
		const campaign = await db.createOpenCampaign(year);
		campaignId = campaign.id;

		country = await db.getCountryOption();
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

	test("reaches the country's reports from the sidebar", async ({ page }) => {
		await page.goto("/en/dashboard");

		// Units are listed by name; the old reporting entries are gone.
		await expect(page.getByRole("link", { name: "Country reports" })).toBeHidden();
		await expect(page.getByRole("link", { name: "Working group reports" })).toBeHidden();
		await page.getByRole("link", { name: country!.name, exact: true }).click();

		await expect(page).toHaveURL(`/en/dashboard/countries/${country!.slug}`);
		await expect(page.getByRole("heading", { level: 1, name: country!.name })).toBeVisible();
		await expect(page.getByRole("tab", { name: "Details" })).toHaveAttribute(
			"aria-selected",
			"true",
		);

		await clickHydrated(page.getByRole("tab", { name: "Reports" }));
		await expect(page).toHaveURL(`/en/dashboard/countries/${country!.slug}/reports`);
		await expect(page.getByRole("tab", { name: "Reports" })).toHaveAttribute(
			"aria-selected",
			"true",
		);

		// Other workers' campaigns may list reports for the same country, so pick this worker's year.
		const reportHref = `/en/dashboard/reporting/country-reports/${String(year!)}/${country!.slug}`;
		const row = page.getByRole("listitem").filter({ hasText: String(year!) });
		await expect(row).toContainText("Draft");
		await expect(row.getByRole("link", { name: "View" })).toHaveAttribute("href", reportHref);
		// A draft in an open campaign is still editable.
		await expect(row.getByRole("link", { name: "Edit" })).toHaveAttribute(
			"href",
			`${reportHref}/edit`,
		);
	});

	test("sends the old reporting overview to the dashboard home", async ({ page }) => {
		await page.goto("/en/dashboard/reporting");

		await expect(page).toHaveURL("/en/dashboard");
	});
});
