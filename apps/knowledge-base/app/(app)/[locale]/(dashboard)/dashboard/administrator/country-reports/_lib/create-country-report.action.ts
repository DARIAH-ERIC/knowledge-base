"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateCountryReportActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/country-reports/_lib/create-country-report.schema";
import { assertAdmin } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const createCountryReportAction = createServerAction(
	async function createCountryReportAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreateCountryReportActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateCountryReportActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { campaignId, countryId, status } = result.output;

		const existing = await db.query.countryReports.findFirst({
			where: { campaignId, countryId },
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({
				message: t("A report for this country and campaign already exists."),
			});
		}

		await db.insert(schema.countryReports).values({ campaignId, countryId, status });

		revalidatePath("/[locale]/dashboard/administrator/country-reports", "layout");

		redirect({ href: "/dashboard/administrator/country-reports", locale });
	},
);
