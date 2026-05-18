import { Button } from "@dariah-eric/ui/button";
import { ButtonLink } from "@dariah-eric/ui/button-link";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ReportScreenCommentSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-screen-comment-section";
import { WorkingGroupReportSummary } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_components/working-group-report-summary";
import { confirmWorkingGroupReportAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/confirm-working-group-report.action";
import { getWorkingGroupReportDataForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/get-working-group-report-summary-data";
import { submitWorkingGroupReportAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/submit-working-group-report.action";
import { can } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { resolveWorkingGroupReportId } from "@/lib/data/reporting-urls";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingWorkingGroupReportConfirmPageProps extends PageProps<"/[locale]/dashboard/reporting/working-group-reports/[year]/[slug]/edit/confirm"> {}

export async function generateMetadata(
	_props: Readonly<DashboardReportingWorkingGroupReportConfirmPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Confirm working group report"),
	});
}

function formatStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function DashboardReportingWorkingGroupReportConfirmPage(
	props: Readonly<DashboardReportingWorkingGroupReportConfirmPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { year: routeYear, slug } = await params;
	const id = await resolveWorkingGroupReportId({ year: routeYear, slug });

	if (id == null) {
		notFound();
	}

	const { user } = await assertAuthenticated();
	const result = await getWorkingGroupReportDataForUser(user, id, "update");

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;

	const t = await getExtracted();
	const canConfirm = await can(user, "confirm", { type: "working_group_report", id });

	return (
		<div className="flex flex-col gap-y-10">
			<WorkingGroupReportSummary data={report.summary} />

			<div className="border-bs pbs-6 flex flex-col gap-y-4">
				<div className="space-y-1">
					<p className="text-sm font-medium text-fg">{t("Status")}</p>
					<p className="text-sm text-muted-fg">{formatStatus(report.status)}</p>
				</div>

				<div className="flex flex-wrap gap-3">
					{report.status === "draft" && report.campaign.status === "open" && (
						<form action={submitWorkingGroupReportAction}>
							<input name="id" type="hidden" value={report.id} />
							<Button type="submit">{t("Submit report")}</Button>
						</form>
					)}

					{canConfirm && report.status === "submitted" && (
						<form action={confirmWorkingGroupReportAction}>
							<input name="id" type="hidden" value={report.id} />
							<Button type="submit">{t("Accept report")}</Button>
						</form>
					)}

					{report.status === "accepted" && (
						<p className="text-sm text-muted-fg">{t("This report has been accepted.")}</p>
					)}

					<ButtonLink
						download={`working-group-report-${id}.json`}
						href={`/api/reporting/working-group-reports/${id}/download`}
						intent="plain"
						size="sm"
					>
						<ArrowDownTrayIcon className="me-2 block-4 inline-4" />
						{t("Download JSON")}
					</ButtonLink>
				</div>
			</div>

			<ReportScreenCommentSection
				reportId={report.id}
				reportType="working_group"
				screenKey="confirm"
			/>
		</div>
	);
}
