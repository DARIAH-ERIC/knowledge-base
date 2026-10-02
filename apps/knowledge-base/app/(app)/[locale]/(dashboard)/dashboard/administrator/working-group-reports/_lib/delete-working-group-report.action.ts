"use server";

import * as schema from "@dariah-eric/database/schema";

import { resolveAuditSubjectLabel } from "@/lib/data/audit-log";
import { and, eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";

export const deleteWorkingGroupReportAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "delete", subjectType: "working_group_reports" },
	revalidate: "/[locale]/dashboard/administrator/working-group-reports",

	async mutate(tx, [id]: [string]) {
		// Snapshot the label while the row still exists, so the audit log doesn't fall back to the uuid.
		const subjectLabel = await resolveAuditSubjectLabel("working_group_reports", id, tx);

		await tx
			.delete(schema.reportScreenComments)
			.where(
				and(
					eq(schema.reportScreenComments.reportType, "working_group"),
					eq(schema.reportScreenComments.reportId, id),
				),
			);
		await tx
			.delete(schema.workingGroupReportAnswers)
			.where(eq(schema.workingGroupReportAnswers.workingGroupReportId, id));
		await tx
			.delete(schema.workingGroupReportEvents)
			.where(eq(schema.workingGroupReportEvents.workingGroupReportId, id));
		await tx
			.delete(schema.workingGroupReportSocialMedia)
			.where(eq(schema.workingGroupReportSocialMedia.workingGroupReportId, id));
		await tx
			.delete(schema.workingGroupReportChairs)
			.where(eq(schema.workingGroupReportChairs.workingGroupReportId, id));
		await tx
			.delete(schema.reportExternalResourceSnapshots)
			.where(eq(schema.reportExternalResourceSnapshots.workingGroupReportId, id));
		await tx.delete(schema.workingGroupReports).where(eq(schema.workingGroupReports.id, id));

		return { subjectId: id, subjectLabel };
	},
});
