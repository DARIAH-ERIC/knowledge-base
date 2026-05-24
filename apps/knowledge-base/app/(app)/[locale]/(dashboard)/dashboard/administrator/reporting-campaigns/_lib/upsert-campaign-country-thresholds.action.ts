"use server";

import * as schema from "@dariah-eric/database/schema";
import { getExtracted } from "next-intl/server";

import { UpsertCampaignCountryThresholdsActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/upsert-campaign-country-thresholds.schema";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const upsertCampaignCountryThresholdsAction = createMutationAction({
	schema: UpsertCampaignCountryThresholdsActionInputSchema,
	requireAdmin: true,
	audit: { action: "update", subjectType: "reporting_campaigns" },
	revalidate: "/[locale]/dashboard/administrator/reporting-campaigns",

	async mutate(tx, input) {
		const t = await getExtracted();

		if (input.amounts != null) {
			for (const [countryId, amount] of Object.entries(input.amounts)) {
				await tx
					.insert(schema.reportingCampaignCountryThresholds)
					.values({ campaignId: input.id, countryId, amount })
					.onConflictDoUpdate({
						target: [
							schema.reportingCampaignCountryThresholds.campaignId,
							schema.reportingCampaignCountryThresholds.countryId,
						],
						set: { amount },
					});
			}
		}

		return { subjectId: input.id, successMessage: t("Saved.") };
	},
});
