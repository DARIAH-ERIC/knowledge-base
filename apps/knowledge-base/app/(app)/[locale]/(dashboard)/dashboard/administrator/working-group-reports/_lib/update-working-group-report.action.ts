"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateWorkingGroupReportActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-group-reports/_lib/update-working-group-report.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateWorkingGroupReportAction = createServerAction(
	async function updateWorkingGroupReportAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpdateWorkingGroupReportActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateWorkingGroupReportActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { id, status } = result.output;

		await db
			.update(schema.workingGroupReports)
			.set({ status })
			.where(eq(schema.workingGroupReports.id, id));

		revalidatePath("/[locale]/dashboard/administrator/working-group-reports", "layout");

		redirect({ href: "/dashboard/administrator/working-group-reports", locale });
	},
);
