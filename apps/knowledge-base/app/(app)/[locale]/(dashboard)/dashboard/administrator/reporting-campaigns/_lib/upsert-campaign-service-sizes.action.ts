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

import { UpsertCampaignServiceSizesActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/upsert-campaign-service-sizes.schema";
import { assertAdmin } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const upsertCampaignServiceSizesAction = createServerAction(
	async function upsertCampaignServiceSizesAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpsertCampaignServiceSizesActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpsertCampaignServiceSizesActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const {
			id,
			small_threshold,
			small_amount,
			medium_threshold,
			medium_amount,
			large_threshold,
			large_amount,
			very_large_threshold,
			very_large_amount,
			core_amount,
		} = result.output;

		const tiered = [
			{ serviceSize: "small" as const, threshold: small_threshold, amount: small_amount },
			{ serviceSize: "medium" as const, threshold: medium_threshold, amount: medium_amount },
			{ serviceSize: "large" as const, threshold: large_threshold, amount: large_amount },
			{
				serviceSize: "very_large" as const,
				threshold: very_large_threshold,
				amount: very_large_amount,
			},
		];

		await db.transaction(async (tx) => {
			for (const { serviceSize, threshold, amount } of tiered) {
				if (amount == null) continue;

				await tx
					.insert(schema.reportingCampaignServiceSizes)
					.values({
						campaignId: id,
						serviceSize,
						visitsThreshold: threshold ?? null,
						amount,
					})
					.onConflictDoUpdate({
						target: [
							schema.reportingCampaignServiceSizes.campaignId,
							schema.reportingCampaignServiceSizes.serviceSize,
						],
						set: { visitsThreshold: threshold ?? null, amount },
					});
			}

			if (core_amount != null) {
				await tx
					.insert(schema.reportingCampaignServiceSizes)
					.values({
						campaignId: id,
						serviceSize: "core",
						visitsThreshold: null,
						amount: core_amount,
					})
					.onConflictDoUpdate({
						target: [
							schema.reportingCampaignServiceSizes.campaignId,
							schema.reportingCampaignServiceSizes.serviceSize,
						],
						set: { amount: core_amount },
					});
			}
		});

		revalidatePath("/[locale]/dashboard/administrator/reporting-campaigns", "layout");

		return createActionStateSuccess({ message: t("Saved.") });
	},
);
