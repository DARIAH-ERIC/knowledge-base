"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { reportingCampaignContributionRoleEnum } from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpsertCampaignContributionAmountsActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/upsert-campaign-contribution-amounts.schema";
import { assertAdmin } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const upsertCampaignContributionAmountsAction = createServerAction(
	async function upsertCampaignContributionAmountsAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpsertCampaignContributionAmountsActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpsertCampaignContributionAmountsActionInputSchema>(
				result.issues,
			);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { id, ...amounts } = result.output;

		await db.transaction(async (tx) => {
			for (const roleType of reportingCampaignContributionRoleEnum) {
				const amount = amounts[roleType];
				if (amount == null) continue;

				await tx
					.insert(schema.reportingCampaignContributionAmounts)
					.values({ campaignId: id, roleType, amount })
					.onConflictDoUpdate({
						target: [
							schema.reportingCampaignContributionAmounts.campaignId,
							schema.reportingCampaignContributionAmounts.roleType,
						],
						set: { amount },
					});
			}
		});

		revalidatePath("/[locale]/dashboard/administrator/reporting-campaigns", "layout");

		return createActionStateSuccess({ message: t("Saved.") });
	},
);
