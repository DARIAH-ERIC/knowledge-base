import { buttonStyles } from "@dariah-eric/ui/button";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
	Header,
	HeaderAction,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { WorkingGroupReportSummary } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_components/working-group-report-summary";
import { getWorkingGroupReportDataForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/get-working-group-report-summary-data";
import { assertAuthenticated } from "@/lib/auth/session";
import { getWorkingGroupReportForAdmin } from "@/lib/data/admin-reporting";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorWorkingGroupReportPageProps extends PageProps<"/[locale]/dashboard/administrator/working-group-reports/[id]"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorWorkingGroupReportPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Working group report"),
	});
}

function formatStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function DashboardAdministratorWorkingGroupReportPage(
	props: Readonly<DashboardAdministratorWorkingGroupReportPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const { user } = await assertAuthenticated();
	const adminReport = await getWorkingGroupReportForAdmin(user, id);

	if (adminReport == null) {
		notFound();
	}

	const result = await getWorkingGroupReportDataForUser(user, id);

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;

	const t = await getExtracted();

	return (
		<div>
			<Header>
				<HeaderContent>
					<HeaderTitle>{report.workingGroup.name}</HeaderTitle>
					<HeaderDescription>
						{t("Campaign {year}", { year: String(report.campaign.year) })}
						{" · "}
						{formatStatus(report.status)}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<a
						className={buttonStyles({ intent: "secondary", size: "sm" })}
						download={`working-group-report-${id}.pdf`}
						href={`/api/reporting/working-group-reports/${id}/download.pdf`}
					>
						<ArrowDownTrayIcon className="me-2 block-4 inline-4" />
						{t("Download PDF")}
					</a>
					<a
						className={buttonStyles({ intent: "secondary", size: "sm" })}
						download={`working-group-report-${id}.json`}
						href={`/api/reporting/working-group-reports/${id}/download`}
					>
						<ArrowDownTrayIcon className="me-2 block-4 inline-4" />
						{t("Download JSON")}
					</a>
				</HeaderAction>
			</Header>

			<div className="px-(--layout-padding) pbs-6">
				<WorkingGroupReportSummary data={report.summary} />
			</div>
		</div>
	);
}
