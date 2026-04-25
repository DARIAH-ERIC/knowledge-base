import { buttonStyles } from "@dariah-eric/ui/button";
import { Link } from "@dariah-eric/ui/link";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import type { CountryReportScope, WorkingGroupReportScope } from "@/lib/data/reporting";

interface ReportingOverviewPageProps {
	scope: {
		workingGroupReports: Array<WorkingGroupReportScope>;
		countryReports: Array<CountryReportScope>;
	};
}

function formatStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export async function ReportingOverviewPage(
	props: Readonly<ReportingOverviewPageProps>,
): Promise<ReactNode> {
	const { scope } = props;

	const t = await getExtracted();

	const hasReports = scope.workingGroupReports.length > 0 || scope.countryReports.length > 0;

	return (
		<div>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Reporting")}</HeaderTitle>
					<HeaderDescription>{t("View and manage your assigned reports.")}</HeaderDescription>
				</HeaderContent>
			</Header>

			{!hasReports ? (
				<p className="px-(--layout-padding) text-sm text-muted-fg">
					{t("No reports are currently assigned to you.")}
				</p>
			) : (
				<div className="flex flex-col gap-y-10 px-(--layout-padding)">
					{scope.workingGroupReports.length > 0 && (
						<section className="flex flex-col gap-y-4">
							<h2 className="text-sm font-semibold text-fg">{t("Working group reports")}</h2>
							<ul className="divide-y rounded-lg border">
								{scope.workingGroupReports.map((report) => {
									return (
										<li
											key={report.reportId}
											className="flex items-center justify-between gap-x-4 px-4 py-3"
										>
											<div className="flex flex-col gap-y-0.5">
												<span className="text-sm font-medium">{report.workingGroupName}</span>
												<span className="text-xs text-muted-fg">{formatStatus(report.status)}</span>
											</div>
											<Link
												className={buttonStyles({ intent: "plain", size: "sm" })}
												href={`/dashboard/reporting/working-group-reports/${report.reportId}/edit`}
											>
												{t("Edit")}
											</Link>
										</li>
									);
								})}
							</ul>
						</section>
					)}

					{scope.countryReports.length > 0 && (
						<section className="flex flex-col gap-y-4">
							<h2 className="text-sm font-semibold text-fg">{t("Country reports")}</h2>
							<ul className="divide-y rounded-lg border">
								{scope.countryReports.map((report) => {
									return (
										<li
											key={report.reportId}
											className="flex items-center justify-between gap-x-4 px-4 py-3"
										>
											<div className="flex flex-col gap-y-0.5">
												<span className="text-sm font-medium">{report.countryName}</span>
												<span className="text-xs text-muted-fg">{formatStatus(report.status)}</span>
											</div>
											<Link
												className={buttonStyles({ intent: "plain", size: "sm" })}
												href={`/dashboard/reporting/country-reports/${report.reportId}/edit`}
											>
												{t("Edit")}
											</Link>
										</li>
									);
								})}
							</ul>
						</section>
					)}
				</div>
			)}
		</div>
	);
}
