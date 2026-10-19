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
import type { CountryReportHistoryItem } from "@/lib/data/reporting";

interface CountryReportsListPageProps {
	isAdmin: boolean;
	reports: Array<CountryReportHistoryItem>;
}

export async function CountryReportsListPage(
	props: Readonly<CountryReportsListPageProps>,
): Promise<ReactNode> {
	const { isAdmin, reports } = props;

	const t = await getExtracted();

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Country reports")}</HeaderTitle>
					<HeaderDescription>{t("View and manage your country reports.")}</HeaderDescription>
				</HeaderContent>
			</Header>

			{reports.length === 0 ? (
				<EmptyState
					description={t("No country reports are available for your account.")}
					title={t("No reports found")}
				/>
			) : (
				<ReportHistoryList
					className="mx-(--layout-padding) mbs-8"
					items={reports.map((report) => {
						return {
							id: report.reportId,
							title: report.countryName,
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
