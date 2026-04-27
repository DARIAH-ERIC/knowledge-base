"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpsertCampaignCountryThresholdsActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/upsert-campaign-country-thresholds.schema";
import { assertAdmin } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const upsertCampaignCountryThresholdsAction = createServerAction(
	async function upsertCampaignCountryThresholdsAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpsertCampaignCountryThresholdsActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpsertCampaignCountryThresholdsActionInputSchema>(
				result.issues,
			);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { id, amounts } = result.output;

		if (amounts != null) {
			await db.transaction(async (tx) => {
				for (const [countryId, amount] of Object.entries(amounts)) {
					await tx
						.insert(schema.reportingCampaignCountryThresholds)
						.values({ campaignId: id, countryId, amount })
						.onConflictDoUpdate({
							target: [
								schema.reportingCampaignCountryThresholds.campaignId,
								schema.reportingCampaignCountryThresholds.countryId,
							],
							set: { amount },
						});
				}
			});
		}

		revalidatePath("/[locale]/dashboard/administrator/reporting-campaigns", "layout");

		return createActionStateSuccess({ message: t("Saved.") });
	},
);
