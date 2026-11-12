"use server";

import { assert } from "@acdh-oeaw/lib";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";

import { CreateCountryReportActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/country-reports/_lib/create-country-report.schema";
import { createCountryReport } from "@/lib/data/create-reports";
import { db } from "@/lib/db";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const createCountryReportAction = createMutationAction({
	schema: CreateCountryReportActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "country_reports" },
	revalidate: "/[locale]/dashboard/administrator/country-reports",
	redirect: "/dashboard/administrator/country-reports",

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

		const existing = await db.query.countryReports.findFirst({
			// input.countryId is the country's document id.
			where: { campaignId: input.campaignId, countryDocumentId: input.countryId },
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({
				message: t("A report for this country and campaign already exists."),
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

		// input.countryId is the country's document id.
		const id = await createCountryReport(tx, campaign, input.countryId, input.status);

		return { subjectId: id };
	},
});
