"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { reportingCampaignSocialMediaCategoryEnum } from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpsertCampaignSocialMediaAmountsActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/upsert-campaign-social-media-amounts.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const upsertCampaignSocialMediaAmountsAction = createServerAction(
	async function upsertCampaignSocialMediaAmountsAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpsertCampaignSocialMediaAmountsActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpsertCampaignSocialMediaAmountsActionInputSchema>(
				result.issues,
			);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { id, ...amounts } = result.output;

		await db.transaction(async (tx) => {
			for (const category of reportingCampaignSocialMediaCategoryEnum) {
				const amount = amounts[category];
				if (amount == null) continue;

				await tx
					.insert(schema.reportingCampaignSocialMediaAmounts)
					.values({ campaignId: id, category, amount })
					.onConflictDoUpdate({
						target: [
							schema.reportingCampaignSocialMediaAmounts.campaignId,
							schema.reportingCampaignSocialMediaAmounts.category,
						],
						set: { amount },
					});
			}
		});

		revalidatePath("/[locale]/dashboard/administrator/reporting-campaigns", "layout");

		return createActionStateSuccess({ message: t("Saved.") });
	},
);
