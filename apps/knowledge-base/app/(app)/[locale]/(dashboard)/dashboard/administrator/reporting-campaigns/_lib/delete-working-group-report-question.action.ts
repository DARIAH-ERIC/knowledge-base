"use server";

import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { eq } from "@/lib/db/sql";
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

	async mutate(tx, input) {
		await tx
			.delete(schema.workingGroupReportQuestions)
			.where(eq(schema.workingGroupReportQuestions.id, input.id));

		return { subjectId: input.campaignId };
	},
});
