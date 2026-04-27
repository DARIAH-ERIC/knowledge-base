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

import { CreateCountryReportContributionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/create-country-report-contribution.schema";
import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const createCountryReportContributionAction = createServerAction(
	async function createCountryReportContributionAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		const { user } = await assertAuthenticated();

		const result = await v.safeParseAsync(
			CreateCountryReportContributionActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateCountryReportContributionActionInputSchema>(
				result.issues,
			);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { countryReportId, personToOrgUnitId } = result.output;

		await assertCan(user, "update", { type: "country_report", id: countryReportId });

		const existing = await db.query.countryReportContributions.findFirst({
			where: { countryReportId, personToOrgUnitId },
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({
				message: t("This person is already listed as a contributor."),
			});
		}

		await db
			.insert(schema.countryReportContributions)
			.values({ countryReportId, personToOrgUnitId });

		revalidatePath("/[locale]/dashboard/reporting", "layout");

		return createActionStateSuccess({ message: t("Added.") });
	},
);
