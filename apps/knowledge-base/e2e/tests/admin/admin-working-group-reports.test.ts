import { expect, test } from "@/e2e/lib/test";

test.describe("working group reports admin", () => {
	/**
	 * Run sequentially within this file. Suites may run concurrently because test data is isolated by
	 * Playwright worker index.
	 *
	 * Each suite creates a dedicated open campaign (year = 3300 + workerIndex) via DB so that the
	 * create-report preCheck passes. Campaign and reports are cleaned up in afterAll.
	 */
	test.describe.configure({ mode: "default" });

	let campaignId: string | null = null;
	let workingGroupId: string | null = null;
	let reportId: string | null = null;
	let ericRelationId: string | null = null;

	/**
	 * Only working groups that are part of DARIAH-EU in the campaign year can get a report, and the
	 * seed relates its working groups to a separate `kitchen-sink-eric`. Relate one for this worker's
	 * campaign year.
	 */
	test.beforeAll(async ({ db }, workerInfo) => {
		const workingGroup = await db.getWorkingGroupOption();
		ericRelationId = await db.createDariahEricRelationForYear(
			workingGroup.id,
			"is_part_of",
			3300 + workerInfo.workerIndex,
		);
	});

	test.afterAll(async ({ db }) => {
		if (reportId != null) {
			await db.deleteWorkingGroupReport(reportId);
		}
		if (campaignId != null) {
			await db.deleteReportingCampaign(campaignId);
		}
		if (ericRelationId != null) {
			await db.deleteUnitRelationById(ericRelationId);
		}
	});

	test("should create a working group report", async ({
		createAdminWorkingGroupReportsPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const campaignYear = 3300 + workerIndex;
		const reportsPage = createAdminWorkingGroupReportsPage(workerIndex);

		const campaign = await db.createOpenCampaign(campaignYear);
		campaignId = campaign.id;

		const workingGroup = await db.getReportingWorkingGroupOption(campaignYear);
		workingGroupId = workingGroup.id;

		await reportsPage.gotoCreate();
		await reportsPage.selectCampaignByYear(campaignYear);
		await reportsPage.selectFirstWorkingGroup();
		await reportsPage.selectStatus("submitted");
		await reportsPage.submitForm();

		const created = await db.getWorkingGroupReportByCampaignAndGroup(campaignId, workingGroupId);
		expect(created).not.toBeNull();
		expect(created).toMatchObject({ status: "submitted" });
		reportId = created!.id;
	});

	test("should edit working group report status", async ({
		createAdminWorkingGroupReportsPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const reportsPage = createAdminWorkingGroupReportsPage(workerIndex);

		await reportsPage.gotoEdit(reportId!);
		await reportsPage.selectStatus("accepted");
		await reportsPage.submitForm();

		const updated = await db.getWorkingGroupReportById(reportId!);
		expect(updated).not.toBeNull();
		expect(updated).toMatchObject({ status: "accepted" });
	});

	test("should delete a working group report", async ({
		createAdminWorkingGroupReportsPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const campaignYear = 3300 + workerIndex;
		const reportsPage = createAdminWorkingGroupReportsPage(workerIndex);

		await reportsPage.goto();

		const workingGroup = await db.getReportingWorkingGroupOption(campaignYear);
		const deleteDialog = await reportsPage.openDeleteDialog(workingGroup.name, campaignYear);
		await expect(deleteDialog).toBeVisible();
		await reportsPage.confirmDelete(deleteDialog);

		const deleted = await db.getWorkingGroupReportById(reportId!);
		expect(deleted).toBeNull();
		reportId = null;
	});
});
