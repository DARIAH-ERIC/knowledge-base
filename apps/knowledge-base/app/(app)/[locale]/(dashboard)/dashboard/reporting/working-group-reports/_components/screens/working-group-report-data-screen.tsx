import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ReportScreenCommentSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-screen-comment-section";
import { WorkingGroupReportChairsSnapshotForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_components/working-group-report-chairs-snapshot-form";
import { WorkingGroupReportDataForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_components/working-group-report-data-form";
import { getAuthorizedWorkingGroupReportForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/get-working-group-report-summary-data";
import { refreshWorkingGroupReportChairsAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/refresh-working-group-report-chairs.action";
import { updateWorkingGroupReportDataAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/update-working-group-report-data.action";
import { assertAuthenticated } from "@/lib/auth/session";
import {
	getWorkingGroupChairCandidates,
	getWorkingGroupChairSnapshotDrift,
	getWorkingGroupReportChairs,
} from "@/lib/data/working-group-report-chairs";
import { db } from "@/lib/db";

interface WorkingGroupReportDataScreenProps {
	reportId: string;
}

/** Shared "data" screen. See {@link getAuthorizedWorkingGroupReportForUser} for authorization. */
export async function WorkingGroupReportDataScreen(
	props: Readonly<WorkingGroupReportDataScreenProps>,
): Promise<ReactNode> {
	const { reportId } = props;

	const { user } = await assertAuthenticated();
	const result = await getAuthorizedWorkingGroupReportForUser(
		user,
		reportId,
		(id) =>
			db.query.workingGroupReports.findFirst({
				where: { id },
				columns: {
					id: true,
					numberOfMembers: true,
					workingGroupDocumentId: true,
					campaignId: true,
				},
				with: {
					campaign: { columns: { year: true } },
					workingGroup: { columns: { id: true } },
				},
			}),
		"update",
	);

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;
	if (report?.workingGroup == null) {
		notFound();
	}

	const { year } = report.campaign;

	const [storedChairs, currentChairs] = await Promise.all([
		getWorkingGroupReportChairs(report.id),
		getWorkingGroupChairCandidates(report.workingGroupDocumentId, year),
	]);
	const { chairs, missing: missingChairs } = getWorkingGroupChairSnapshotDrift(
		storedChairs,
		currentChairs,
	);

	const t = await getExtracted();

	return (
		<div className="flex flex-col gap-y-12">
			<section className="flex flex-col gap-y-4">
				<h2 className="text-sm font-semibold text-fg">{t("Working group data")}</h2>
				<WorkingGroupReportDataForm
					formAction={updateWorkingGroupReportDataAction}
					report={report}
				/>
			</section>

			<WorkingGroupReportChairsSnapshotForm
				canManageRelations={user.role === "admin"}
				chairs={chairs}
				missing={missingChairs}
				refreshAction={refreshWorkingGroupReportChairsAction}
				workingGroupReportId={report.id}
			/>

			<ReportScreenCommentSection
				reportId={report.id}
				reportType="working_group"
				screenKey="data"
			/>
		</div>
	);
}
