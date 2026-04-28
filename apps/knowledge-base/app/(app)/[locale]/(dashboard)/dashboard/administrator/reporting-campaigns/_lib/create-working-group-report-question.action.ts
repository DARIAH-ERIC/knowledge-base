"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import type { JSONContent } from "@tiptap/core";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

const CreateWorkingGroupReportQuestionSchema = v.object({
	campaignId: v.pipe(v.string(), v.uuid()),
	question: v.pipe(v.string(), v.nonEmpty()),
});

export const createWorkingGroupReportQuestionAction = createServerAction(
	async function createWorkingGroupReportQuestionAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreateWorkingGroupReportQuestionSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateWorkingGroupReportQuestionSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { campaignId, question: questionJson } = result.output;

		const existing = await db.query.workingGroupReportQuestions.findMany({
			where: { campaignId },
			columns: { position: true },
			orderBy: { position: "desc" },
		});

		const nextPosition = existing.length > 0 ? existing[0]!.position + 1 : 1;

		let question: JSONContent;
		try {
			question = JSON.parse(questionJson) as JSONContent;
		} catch {
			return createActionStateError({ message: t("Invalid question content.") });
		}

		await db.insert(schema.workingGroupReportQuestions).values({
			campaignId,
			question,
			position: nextPosition,
		});

		revalidatePath("/[locale]/dashboard/administrator/reporting-campaigns", "layout");

		return createActionStateSuccess({ message: t("Added.") });
	},
);
