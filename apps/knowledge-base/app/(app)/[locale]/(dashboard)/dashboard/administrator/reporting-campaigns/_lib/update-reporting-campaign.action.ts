"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateReportingCampaignActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/update-reporting-campaign.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateReportingCampaignAction = createServerAction(
	async function updateReportingCampaignAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpdateReportingCampaignActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateReportingCampaignActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { id, year, status } = result.output;

		const existing = await db.query.reportingCampaigns.findFirst({
			where: { year },
			columns: { id: true },
		});

		if (existing != null && existing.id !== id) {
			return createActionStateError({
				message: t("A campaign for this year already exists."),
				validationErrors: {
					year: [t("A campaign for this year already exists.")],
				} as unknown as ValidationErrors,
			});
		}

		await db
			.update(schema.reportingCampaigns)
			.set({ year, status })
			.where(eq(schema.reportingCampaigns.id, id));

		revalidatePath("/[locale]/dashboard/administrator/reporting-campaigns", "layout");

		redirect({ href: "/dashboard/administrator/reporting-campaigns", locale });
	},
);
