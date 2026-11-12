"use server";

import { assert } from "@acdh-oeaw/lib";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";

import { CreateWorkingGroupReportActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-group-reports/_lib/create-working-group-report.schema";
import { createWorkingGroupReport } from "@/lib/data/create-reports";
import { db } from "@/lib/db";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const createWorkingGroupReportAction = createMutationAction({
	schema: CreateWorkingGroupReportActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "working_group_reports" },
	revalidate: "/[locale]/dashboard/administrator/working-group-reports",
	redirect: "/dashboard/administrator/working-group-reports",

	async preCheck({ input }) {
		const t = await getExtracted();

		const campaign = await db.query.reportingCampaigns.findFirst({
			where: { id: input.campaignId },
			columns: { status: true },
		});

		if (campaign?.status !== "open") {
			return createActionStateError({
				message: t("Only open campaigns can be used for new reports."),
			});
		}

		const existing = await db.query.workingGroupReports.findFirst({
			// input.workingGroupId is the working group's document id.
			where: { campaignId: input.campaignId, workingGroupDocumentId: input.workingGroupId },
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({
				message: t("A report for this working group and campaign already exists."),
			});
		}

		return undefined;
	},

	async mutate(tx, input) {
		const campaign = await tx.query.reportingCampaigns.findFirst({
			where: { id: input.campaignId },
			columns: { id: true, year: true },
		});
		assert(campaign);

		// input.workingGroupId is the working group's document id.
		const id = await createWorkingGroupReport(tx, campaign, input.workingGroupId, input.status);

		return { subjectId: id };
	},
});
