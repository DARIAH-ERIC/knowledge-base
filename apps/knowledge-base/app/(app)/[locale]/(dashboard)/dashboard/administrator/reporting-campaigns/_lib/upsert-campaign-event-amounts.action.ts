"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { reportingCampaignEventTypeEnum } from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpsertCampaignEventAmountsActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/upsert-campaign-event-amounts.schema";
import { assertAdmin } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const upsertCampaignEventAmountsAction = createServerAction(
	async function upsertCampaignEventAmountsAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpsertCampaignEventAmountsActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpsertCampaignEventAmountsActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { id, ...amounts } = result.output;

		await db.transaction(async (tx) => {
			for (const eventType of reportingCampaignEventTypeEnum) {
				const amount = amounts[eventType];
				if (amount == null) continue;

				await tx
					.insert(schema.reportingCampaignEventAmounts)
					.values({ campaignId: id, eventType, amount })
					.onConflictDoUpdate({
						target: [
							schema.reportingCampaignEventAmounts.campaignId,
							schema.reportingCampaignEventAmounts.eventType,
						],
						set: { amount },
					});
			}
		});

		revalidatePath("/[locale]/dashboard/administrator/reporting-campaigns", "layout");

		return createActionStateSuccess({ message: t("Saved.") });
	},
);
