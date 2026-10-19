import { EmptyState } from "@dariah-eric/ui/empty-state";
import { getExtracted } from "next-intl/server";
import { Fragment, type ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import {
	ReportHistoryList,
	formatReportStatus,
	isReportHistoryItemEditable,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-history-list";
import type { WorkingGroupReportHistoryItem } from "@/lib/data/reporting";

interface WorkingGroupReportsListPageProps {
	isAdmin: boolean;
	reports: Array<WorkingGroupReportHistoryItem>;
}

export async function WorkingGroupReportsListPage(
	props: Readonly<WorkingGroupReportsListPageProps>,
): Promise<ReactNode> {
	const { isAdmin, reports } = props;

	const t = await getExtracted();

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Working group reports")}</HeaderTitle>
					<HeaderDescription>{t("View and manage your working group reports.")}</HeaderDescription>
				</HeaderContent>
			</Header>

			{reports.length === 0 ? (
				<EmptyState
					description={t("No working group reports are available for your account.")}
					title={t("No reports found")}
				/>
			) : (
				<ReportHistoryList
					className="mx-(--layout-padding) mbs-8"
					items={reports.map((report) => {
						return {
							id: report.reportId,
							title: report.workingGroupName,
							description: `${String(report.campaignYear)} · ${formatReportStatus(report.reportStatus)}`,
							href: report.reportHref,
							editHref: isReportHistoryItemEditable(report, isAdmin)
								? `${report.reportHref}/edit`
								: null,
						};
					})}
				/>
			)}
		</Fragment>
	);
}
