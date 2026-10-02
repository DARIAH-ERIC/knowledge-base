"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";
import { forbidden } from "next/navigation";
import * as v from "valibot";

import {
	getWorkingGroupReportEditHrefById,
	workingGroupReportRevalidatePaths,
} from "@/lib/data/reporting-urls";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const InputSchema = v.object({ id: v.pipe(v.string(), v.uuid()) });

export const confirmWorkingGroupReportAction = createMutationAction<
	typeof InputSchema,
	{ href: string }
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
		// Accepting a submitted report is admin-only.
		if (ctx.user.role !== "admin") {
			forbidden();
		}

		const report = await db.query.workingGroupReports.findFirst({
			where: { id: input.id },
			columns: { status: true },
		});
		// Only a submitted report can be accepted.
		if (report?.status !== "submitted") {
			const t = await getExtracted();
			return createActionStateError({
				message: t("Only a submitted report can be accepted. Refresh the page and try again."),
			});
		}
		return undefined;
	},

	async mutate(tx, input) {
		await tx
			.update(schema.workingGroupReports)
			.set({ status: "accepted" })
			.where(eq(schema.workingGroupReports.id, input.id));

		return {
			subjectId: input.id,
			auditSummary: { status: "accepted" },
			successData: { href: await getWorkingGroupReportEditHrefById(input.id, "confirm") },
		};
	},
});
