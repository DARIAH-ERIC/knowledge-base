"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import * as v from "valibot";

import { CreateWorkingGroupReportSocialMediaActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/create-working-group-report-social-media.schema";
import {
	getAuditSubjectIdFromFormData,
	getAuditSummaryFromFormData,
	recordAuditEvent,
} from "@/lib/audit/audit-log";
import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const createWorkingGroupReportSocialMediaAction = createServerAction(
	async function createWorkingGroupReportSocialMediaAction(_state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		const { user } = await assertAuthenticated();

		const result = await v.safeParseAsync(
			CreateWorkingGroupReportSocialMediaActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateWorkingGroupReportSocialMediaActionInputSchema>(
				result.issues,
			);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const { workingGroupReportId, socialMediaId } = result.output;

		await assertCan(user, "update", { type: "working_group_report", id: workingGroupReportId });

		const existing = await db.query.workingGroupReportSocialMedia.findFirst({
			where: { workingGroupReportId, socialMediaId },
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({ message: t("This account is already listed.") });
		}

		await db
			.insert(schema.workingGroupReportSocialMedia)
			.values({ workingGroupReportId, socialMediaId });

		await recordAuditEvent(db, {
			actorUserId: user.id,
			action: "create",
			subjectType: "working_group_report",
			subjectId: getAuditSubjectIdFromFormData(formData),
			summary: getAuditSummaryFromFormData(formData),
		});

		revalidatePath("/[locale]/dashboard/reporting", "layout");

		return createActionStateSuccess({ message: t("Added.") });
	},
);
