"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
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

import { UpdateCountryReportEventsActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/update-country-report-events.schema";
import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateCountryReportEventsAction = createServerAction(
	async function updateCountryReportEventsAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		const { user } = await assertAuthenticated();

		const result = await v.safeParseAsync(
			UpdateCountryReportEventsActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateCountryReportEventsActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const {
			id,
			smallEvents,
			mediumEvents,
			largeEvents,
			veryLargeEvents,
			dariahCommissionedEvent,
			reusableOutcomes,
		} = result.output;

		await assertCan(user, "update", { type: "country_report", id });

		await db
			.update(schema.countryReports)
			.set({
				smallEvents: smallEvents ?? null,
				mediumEvents: mediumEvents ?? null,
				largeEvents: largeEvents ?? null,
				veryLargeEvents: veryLargeEvents ?? null,
				dariahCommissionedEvent: dariahCommissionedEvent ?? null,
				reusableOutcomes: reusableOutcomes ?? null,
			})
			.where(eq(schema.countryReports.id, id));

		revalidatePath("/[locale]/dashboard/reporting", "layout");

		return createActionStateSuccess({ message: t("Saved.") });
	},
);
