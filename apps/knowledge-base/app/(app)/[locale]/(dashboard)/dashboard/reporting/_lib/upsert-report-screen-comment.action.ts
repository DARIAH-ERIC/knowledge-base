"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import type { JSONContent } from "@tiptap/core";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { isEmptyRichTextDocument } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_lib/report-screen-comments";
import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

const UpsertReportScreenCommentActionInputSchema = v.object({
	reportId: v.pipe(v.string(), v.uuid()),
	reportType: v.picklist(schema.reportScreenCommentTypeEnum),
	screenKey: v.picklist(schema.reportScreenCommentKeyEnum),
	comment: v.optional(v.string()),
});

export const upsertReportScreenCommentAction = createServerAction(
	async function upsertReportScreenCommentAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		const result = await v.safeParseAsync(
			UpsertReportScreenCommentActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpsertReportScreenCommentActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { reportId, reportType, screenKey, comment: commentJson } = result.output;

		const { user } = await assertAuthenticated();
		await assertCan(user, "update", {
			type: reportType === "country" ? "country_report" : "working_group_report",
			id: reportId,
		});

		let comment: JSONContent | null = null;

		if (commentJson != null && commentJson.trim() !== "") {
			try {
				comment = JSON.parse(commentJson) as JSONContent;
			} catch {
				return createActionStateError({ message: t("Invalid or missing fields.") });
			}
		}

		if (isEmptyRichTextDocument(comment)) {
			await db
				.delete(schema.reportScreenComments)
				.where(
					and(
						eq(schema.reportScreenComments.reportType, reportType),
						eq(schema.reportScreenComments.reportId, reportId),
						eq(schema.reportScreenComments.screenKey, screenKey),
					),
				);
		} else {
			await db
				.insert(schema.reportScreenComments)
				.values({
					reportType,
					reportId,
					screenKey,
					comment,
				})
				.onConflictDoUpdate({
					target: [
						schema.reportScreenComments.reportType,
						schema.reportScreenComments.reportId,
						schema.reportScreenComments.screenKey,
					],
					set: {
						comment,
						updatedAt: new Date(),
					},
				});
		}

		revalidatePath("/[locale]/dashboard/reporting", "layout");

		return createActionStateSuccess({ message: t("Saved.") });
	},
);
