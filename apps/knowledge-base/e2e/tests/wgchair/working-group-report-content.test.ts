import { expect, test } from "@/e2e/lib/test";

/**
 * Working-group-report content editing as a chair. Covers the Data tab (members / mailing list save
 * round-trip) and the Questions tab (rich-text answer persisted via the batched upsert action). A
 * question is seeded for the campaign so the questions form renders an answer editor.
 */
test.describe("working group report content (chair)", () => {
	test.describe.configure({ mode: "default" });

	let campaignId: string | null = null;
	let reportId: string | null = null;
	let questionId: string | null = null;
	let year: number | null = null;
	let slug: string | null = null;

	test.beforeAll(async ({ db }) => {
		year = 3750 + test.info().workerIndex;
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

		const question = await db.createWorkingGroupReportQuestion({
			campaignId: campaign.id,
			questionText: "What did the working group achieve this year?",
			position: 1,
		});
		questionId = question.id;
	});

	test.afterAll(async ({ db }) => {
		if (campaignId != null) {
			await db.deleteReportingCampaign(campaignId);
		}
	});

	test("saves members and mailing list", async ({ page }) => {
		await page.goto(`/en/dashboard/reporting/working-group-reports/${year!}/${slug!}/edit/data`);

		await page.getByLabel("Number of members").fill("15");
		await page.getByLabel("Mailing list").fill("wg-list@example.org");
		await page.getByRole("button", { name: "Save" }).click();

		await expect(page.getByLabel("Number of members")).toHaveValue("15");

		await page.reload();
		await expect(page.getByLabel("Number of members")).toHaveValue("15");
		await expect(page.getByLabel("Mailing list")).toHaveValue("wg-list@example.org");
	});

	test("saves a rich-text answer", async ({ page, db }) => {
		await page.goto(`/en/dashboard/reporting/working-group-reports/${year!}/${slug!}/edit/questions`);

		// The seeded question is shown (read-only) and offers an answer editor.
		await expect(page.getByText("What did the working group achieve this year?")).toBeVisible();

		const answer = page.getByLabel("Answer to question 1");
		await answer.click();
		await page.keyboard.type("We ran three workshops.");

		await page.getByRole("button", { name: "Save" }).click();

		// The batched upsert persists the answer for this report + question.
		await expect(async () => {
			const row = await db.getWorkingGroupReportAnswer(reportId!, questionId!);
			expect(JSON.stringify(row?.answer ?? null)).toContain("We ran three workshops.");
		}).toPass({ timeout: 10_000 });
	});
});
