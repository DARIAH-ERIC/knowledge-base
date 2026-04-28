"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateReportingCampaignActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/create-reporting-campaign.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const createReportingCampaignAction = createServerAction(
	async function createReportingCampaignAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreateReportingCampaignActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateReportingCampaignActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { year, status } = result.output;

		const existing = await db.query.reportingCampaigns.findFirst({
			where: { year },
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({
				message: t("A campaign for this year already exists."),
				validationErrors: {
					year: [t("A campaign for this year already exists.")],
				} as unknown as ValidationErrors,
			});
		}

		await db.insert(schema.reportingCampaigns).values({ year, status });

		revalidatePath("/[locale]/dashboard/administrator/reporting-campaigns", "layout");

		redirect({ href: "/dashboard/administrator/reporting-campaigns", locale });
	},
);
