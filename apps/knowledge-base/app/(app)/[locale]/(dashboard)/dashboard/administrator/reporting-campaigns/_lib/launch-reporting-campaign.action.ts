"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";
import * as v from "valibot";

import { checkCampaignReadyToOpen } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/campaign-readiness";
import { findOtherOpenCampaign } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/find-other-open-campaign";
import { createCountryReport, createWorkingGroupReport } from "@/lib/data/create-reports";
import {
	getReportingCountries,
	getReportingWorkingGroups,
} from "@/lib/data/reporting-campaign-readiness";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const InputSchema = v.object({ id: v.pipe(v.string(), v.uuid()) });

export const launchReportingCampaignAction = createMutationAction({
	schema: InputSchema,
	requireAdmin: true,
	audit: { action: "launch", subjectType: "reporting_campaigns" },
	revalidate: "/[locale]/dashboard/administrator/reporting-campaigns",
	redirect: ({ input }) => `/dashboard/administrator/reporting-campaigns/${input.id}/edit/settings`,

	async preCheck({ input }) {
		const campaign = await db.query.reportingCampaigns.findFirst({
			where: { id: input.id },
			columns: { status: true },
		});
		if (campaign?.status !== "draft") {
			const t = await getExtracted();
			return createActionStateError({ message: t("Campaign cannot be launched.") });
		}
		const openCampaign = await findOtherOpenCampaign(input.id);
		if (openCampaign != null) {
			const t = await getExtracted();
			return createActionStateError({
				message: t(
					"The {year} campaign is still open. Close it before launching another campaign.",
					{ year: String(openCampaign.year) },
				),
			});
		}
		return checkCampaignReadyToOpen(input.id);
	},

	async mutate(tx, input) {
		const [campaign] = await tx
			.update(schema.reportingCampaigns)
			.set({ status: "open" })
			.where(eq(schema.reportingCampaigns.id, input.id))
			.returning({ id: schema.reportingCampaigns.id, year: schema.reportingCampaigns.year });
		assert(campaign);

		// Every country and working group that reports for the campaign year gets a draft report, so
		// coordinators and chairs can start as soon as the campaign is open. Reports are created one at
		// a time, in the same transaction: if any of them fails, the campaign stays a draft.
		const [countries, workingGroups] = await Promise.all([
			getReportingCountries(campaign.year, tx),
			getReportingWorkingGroups(campaign.year, tx),
		]);

		for (const country of countries) {
			await createCountryReport(tx, campaign, country.id);
		}
		for (const workingGroup of workingGroups) {
			await createWorkingGroupReport(tx, campaign, workingGroup.id);
		}

		return { subjectId: input.id };
	},
});
