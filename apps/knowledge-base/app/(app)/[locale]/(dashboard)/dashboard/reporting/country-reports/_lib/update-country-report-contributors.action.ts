"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import * as v from "valibot";

import { UpdateCountryReportContributorsActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/update-country-report-contributors.schema";
import {
	getAuditSubjectIdFromFormData,
	getAuditSummaryFromFormData,
	recordAuditEvent,
} from "@/lib/audit/audit-log";
import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateCountryReportContributorsAction = createServerAction(
	async function updateCountryReportContributorsAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		const { user } = await assertAuthenticated();

		const result = await v.safeParseAsync(
			UpdateCountryReportContributorsActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateCountryReportContributorsActionInputSchema>(
				result.issues,
			);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const { id, totalContributors } = result.output;

		await assertCan(user, "update", { type: "country_report", id });

		await db
			.update(schema.countryReports)
			.set({ totalContributors: totalContributors ?? null })
			.where(eq(schema.countryReports.id, id));

		await recordAuditEvent(db, {
			actorUserId: user.id,
			action: "update",
			subjectType: "country_report",
			subjectId: getAuditSubjectIdFromFormData(formData),
			summary: getAuditSummaryFromFormData(formData),
		});

		revalidatePath("/[locale]/dashboard/reporting", "layout");

		return createActionStateSuccess({ message: t("Saved.") });
	},
);
