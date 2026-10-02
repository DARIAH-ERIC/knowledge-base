"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";
import * as v from "valibot";

import { assertCan } from "@/lib/auth/permissions";
import {
	getWorkingGroupReportEditHrefById,
	workingGroupReportRevalidatePaths,
} from "@/lib/data/reporting-urls";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { sendReportSubmittedNotification } from "@/lib/email/send-report-submitted-notification";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const InputSchema = v.object({ id: v.pipe(v.string(), v.uuid()) });

export const submitWorkingGroupReportAction = createMutationAction<
	typeof InputSchema,
	{ href: string; name: string | null; year: number | null }
>({
	schema: InputSchema,
	requireAuth: true,
	audit: { action: "update", subjectType: "working_group_reports" },
	revalidate: workingGroupReportRevalidatePaths,
	redirect: ({ result }) => {
		assert(result.successData, "Missing redirect target.");
		return result.successData.href;
	},

	async preCheck({ input, ctx }) {
		// Submitting is reserved for the confirm role (WG chairs / admins), not plain reporters.
		await assertCan(ctx.user, "confirm", { type: "working_group_report", id: input.id });

		const report = await db.query.workingGroupReports.findFirst({
			where: { id: input.id },
			columns: { status: true },
			with: { campaign: { columns: { status: true } } },
		});
		// Only a draft report in an open campaign can be submitted (no re-submit; accepted is terminal).
		if (report?.status !== "draft" || report.campaign.status !== "open") {
			const t = await getExtracted();
			return createActionStateError({
				message: t(
					"Only a draft report in an open campaign can be submitted. Refresh the page and try again.",
				),
			});
		}
		return undefined;
	},

	async mutate(tx, input) {
		const report = await tx.query.workingGroupReports.findFirst({
			where: { id: input.id },
			columns: { id: true },
			with: {
				campaign: { columns: { year: true } },
				workingGroup: { columns: { name: true } },
			},
		});

		await tx
			.update(schema.workingGroupReports)
			.set({ status: "submitted" })
			.where(eq(schema.workingGroupReports.id, input.id));

		return {
			subjectId: input.id,
			auditSummary: { status: "submitted" },
			successData: {
				href: await getWorkingGroupReportEditHrefById(input.id, "confirm"),
				name: report?.workingGroup?.name ?? null,
				year: report?.campaign.year ?? null,
			},
		};
	},

	// Best-effort notification after commit, so a slow/failing mail server can not delay or block the
	// submission, whose outcome does not depend on the email being delivered.
	async postCommit({ result, ctx }) {
		const data = result.successData;
		if (data?.year == null) {
			return;
		}
		await sendReportSubmittedNotification({
			type: "working_group_report",
			name: data.name,
			year: data.year,
			href: data.href,
			locale: ctx.locale,
			submittedBy: { name: ctx.user.name, email: ctx.user.email },
		});
	},
});
