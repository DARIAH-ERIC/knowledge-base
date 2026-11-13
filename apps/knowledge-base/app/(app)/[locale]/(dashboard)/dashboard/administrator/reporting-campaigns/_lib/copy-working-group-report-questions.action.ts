"use server";

import { isEmptyRichTextDocument } from "@dariah-eric/database/rich-text";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";
import * as v from "valibot";

import { checkCampaignEditable } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/campaign-readiness";
import { db } from "@/lib/db";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const InputSchema = v.object({ campaignId: v.pipe(v.string(), v.uuid()) });

/**
 * Copies the questions of the latest campaign before this one, in their order. Only offered while
 * the campaign has no questions yet, so a repeated submission cannot duplicate them.
 */
export const copyWorkingGroupReportQuestionsAction = createMutationAction({
	schema: InputSchema,
	requireAdmin: true,
	audit: { action: "update", subjectType: "reporting_campaigns" },
	revalidate: "/[locale]/dashboard/administrator/reporting-campaigns",

	async preCheck({ input }) {
		const notEditable = await checkCampaignEditable(input.campaignId);
		if (notEditable != null) {
			return notEditable;
		}

		const existing = await db.query.workingGroupReportQuestions.findFirst({
			where: { campaignId: input.campaignId },
			columns: { id: true },
		});
		if (existing != null) {
			const t = await getExtracted();
			return createActionStateError({ message: t("This campaign already has questions.") });
		}

		return undefined;
	},

	async mutate(tx, input) {
		const t = await getExtracted();

		const campaign = await tx.query.reportingCampaigns.findFirst({
			where: { id: input.campaignId },
			columns: { year: true },
		});
		const previous =
			campaign != null
				? await tx.query.reportingCampaigns.findFirst({
						where: { year: { lt: campaign.year } },
						orderBy: { year: "desc" },
						columns: { year: true },
						with: {
							workingGroupReportQuestions: {
								columns: { question: true, position: true },
								orderBy: { position: "asc" },
							},
						},
					})
				: undefined;

		// Skip empty questions that an earlier campaign may still hold.
		const questions = (previous?.workingGroupReportQuestions ?? []).filter(
			(question) => !isEmptyRichTextDocument(question.question),
		);

		if (questions.length > 0) {
			await tx.insert(schema.workingGroupReportQuestions).values(
				questions.map((question, index) => {
					return { campaignId: input.campaignId, question: question.question, position: index + 1 };
				}),
			);
		}

		return {
			subjectId: input.campaignId,
			successMessage: t("Copied {count} questions.", { count: String(questions.length) }),
		};
	},
});
