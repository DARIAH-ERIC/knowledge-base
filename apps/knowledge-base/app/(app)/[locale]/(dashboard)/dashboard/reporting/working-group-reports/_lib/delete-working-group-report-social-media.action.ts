"use server";

import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { assertCan, assertReportEditable } from "@/lib/auth/permissions";
import { workingGroupReportRevalidatePaths } from "@/lib/data/reporting-urls";
import { and, eq } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const InputSchema = v.object({
	claimedId: v.pipe(v.string(), v.uuid()),
	workingGroupReportId: v.pipe(v.string(), v.uuid()),
});

export const deleteWorkingGroupReportSocialMediaAction = createMutationAction({
	schema: InputSchema,
	requireAuth: true,
	audit: { action: "delete", subjectType: "working_group_reports" },
	revalidate: workingGroupReportRevalidatePaths,

	async preCheck({ input, ctx }) {
		await assertCan(ctx.user, "update", {
			type: "working_group_report",
			id: input.workingGroupReportId,
		});
		await assertReportEditable(ctx.user, {
			type: "working_group_report",
			id: input.workingGroupReportId,
		});
		return undefined;
	},

	async mutate(tx, input) {
		const { claimedId, workingGroupReportId } = input;

		// Scope by both ids so a row can only be removed via the report it belongs to (the authz check is
		// on workingGroupReportId, so matching the claimed id alone would allow cross-report deletes).
		await tx
			.delete(schema.workingGroupReportSocialMedia)
			.where(
				and(
					eq(schema.workingGroupReportSocialMedia.id, claimedId),
					eq(schema.workingGroupReportSocialMedia.workingGroupReportId, workingGroupReportId),
				),
			);

		return { subjectId: workingGroupReportId };
	},
});
