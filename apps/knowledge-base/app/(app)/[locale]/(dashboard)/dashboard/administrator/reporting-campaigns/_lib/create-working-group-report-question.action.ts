"use server";

import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import type { JSONContent } from "@tiptap/core";
import { getExtracted } from "next-intl/server";
import * as v from "valibot";

import { db } from "@/lib/db";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const CreateWorkingGroupReportQuestionSchema = v.object({
	campaignId: v.pipe(v.string(), v.uuid()),
	question: v.pipe(v.string(), v.nonEmpty()),
});

export const createWorkingGroupReportQuestionAction = createMutationAction({
	schema: CreateWorkingGroupReportQuestionSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "reporting_campaigns" },
	revalidate: "/[locale]/dashboard/administrator/reporting-campaigns",

	async mutate(tx, input) {
		const t = await getExtracted();

		const existing = await tx.query.workingGroupReportQuestions.findMany({
			where: { campaignId: input.campaignId },
			columns: { position: true },
			orderBy: { position: "desc" },
		});
		const nextPosition = existing.length > 0 ? existing[0]!.position + 1 : 1;

		let question: JSONContent;
		try {
			question = JSON.parse(input.question) as JSONContent;
		} catch {
			// Return-of-error from inside mutate isn't supported; throw so the wrapper's catch turns
			// this into a generic "Internal server error". Validation should normally have caught it.
			throw createActionStateError({ message: t("Invalid question content.") });
		}

		await tx.insert(schema.workingGroupReportQuestions).values({
			campaignId: input.campaignId,
			question,
			position: nextPosition,
		});

		return { subjectId: input.campaignId, successMessage: t("Added.") };
	},
});
