"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";

export async function deleteWorkingGroupReportAction(id: string): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
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
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession.user.id,
		action: "delete",
		subjectType: "working_group_reports",
		subjectId: id,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/administrator/working-group-reports", "layout");
}
