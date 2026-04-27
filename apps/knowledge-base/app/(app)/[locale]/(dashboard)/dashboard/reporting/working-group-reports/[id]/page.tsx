import { buttonStyles } from "@dariah-eric/ui/button";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import {
	Header,
	HeaderAction,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { WorkingGroupReportSummary } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_components/working-group-report-summary";
import { getWorkingGroupReportData } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/get-working-group-report-summary-data";
import { assertAuthenticated } from "@/lib/auth/session";
import { getUserAllWorkingGroupReports } from "@/lib/data/reporting";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingWorkingGroupReportPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	props: Readonly<DashboardReportingWorkingGroupReportPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const { params } = props;

	const { id } = await params;

	const t = await getExtracted();

	const report = await getWorkingGroupReportData(id);

	return createMetadata(resolvingMetadata, {
		title:
			report != null
				? t("Dashboard - {name} working group report {year}", {
						name: report.workingGroup.name,
						year: String(report.campaign.year),
					})
				: t("Dashboard - Working group report"),
	});
}

function formatStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function DashboardReportingWorkingGroupReportPage(
	props: Readonly<DashboardReportingWorkingGroupReportPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const [report, { user }] = await Promise.all([
		getWorkingGroupReportData(id),
		assertAuthenticated(),
	]);

	if (report == null) {
		notFound();
	}

	if (user.role !== "admin") {
		const userReports = await getUserAllWorkingGroupReports(user);
		const hasAccess = userReports.some((r) => {
			return r.reportId === id;
		});
		if (!hasAccess) notFound();
	}

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
						download={`working-group-report-${id}.json`}
						href={`/api/reporting/working-group-reports/${id}/download`}
					>
						<ArrowDownTrayIcon className="mr-2 size-4" />
						{t("Download JSON")}
					</a>
				</HeaderAction>
			</Header>

			<div className="px-(--layout-padding) pt-6">
				<WorkingGroupReportSummary data={report.summary} />
			</div>
		</div>
	);
}
