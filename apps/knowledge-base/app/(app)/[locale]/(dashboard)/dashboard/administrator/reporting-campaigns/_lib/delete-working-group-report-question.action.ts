"use server";

import { isEmptyRichTextDocument } from "@dariah-eric/database/rich-text";
import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { checkCampaignEditable } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/campaign-readiness";
import { assertNotReferencedByReports } from "@/lib/data/report-references";
import { eq, inArray } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const InputSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	campaignId: v.pipe(v.string(), v.uuid()),
});

export const deleteWorkingGroupReportQuestionAction = createMutationAction({
	schema: InputSchema,
	requireAdmin: true,
	audit: { action: "delete", subjectType: "reporting_campaigns" },
	revalidate: "/[locale]/dashboard/administrator/reporting-campaigns",
	redirect: ({ input }) =>
		`/dashboard/administrator/reporting-campaigns/${input.campaignId}/edit/questions`,

	preCheck({ input }) {
		return checkCampaignEditable(input.campaignId);
	},

	async mutate(tx, input) {
		// Empty answers (stored by older saves of an unanswered question) record nothing, so they do
		// not keep the question alive; real answers record what a report said, so those block deletion.
		const answers = await tx.query.workingGroupReportAnswers.findMany({
			where: { questionId: input.id },
			columns: { id: true, answer: true },
		});
		const emptyAnswerIds = answers
			.filter((answer) => isEmptyRichTextDocument(answer.answer))
			.map((answer) => answer.id);
		if (emptyAnswerIds.length > 0) {
			await tx
				.delete(schema.workingGroupReportAnswers)
				.where(inArray(schema.workingGroupReportAnswers.id, emptyAnswerIds));
		}

		await assertNotReferencedByReports(tx, {
			type: "working_group_report_question",
			id: input.id,
		});

		await tx
			.delete(schema.workingGroupReportQuestions)
			.where(eq(schema.workingGroupReportQuestions.id, input.id));

		return { subjectId: input.campaignId };
	},
});
