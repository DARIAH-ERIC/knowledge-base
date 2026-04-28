"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateWorkingGroupReportActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-group-reports/_lib/create-working-group-report.schema";
import { assertAdmin } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const createWorkingGroupReportAction = createServerAction(
	async function createWorkingGroupReportAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreateWorkingGroupReportActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateWorkingGroupReportActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { campaignId, workingGroupId, status } = result.output;

		const existing = await db.query.workingGroupReports.findFirst({
			where: { campaignId, workingGroupId },
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({
				message: t("A report for this working group and campaign already exists."),
			});
		}

		await db.insert(schema.workingGroupReports).values({ campaignId, workingGroupId, status });

		revalidatePath("/[locale]/dashboard/administrator/working-group-reports", "layout");

		redirect({ href: "/dashboard/administrator/working-group-reports", locale });
	},
);
