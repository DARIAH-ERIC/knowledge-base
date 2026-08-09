import type { ReactNode } from "react";

import { ReportingStatisticsShell } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-statistics/_components/reporting-statistics-shell";
import { assertAdminPageAccess } from "@/lib/auth/session";
import { getReportingStatisticsFilterOptionsForAdmin } from "@/lib/data/admin-reporting";

interface DashboardAdministratorReportingStatisticsLayoutProps extends LayoutProps<"/[locale]/dashboard/administrator/reporting-statistics"> {}

export default async function DashboardAdministratorReportingStatisticsLayout(
	props: Readonly<DashboardAdministratorReportingStatisticsLayoutProps>,
): Promise<ReactNode> {
	const { children } = props;

	const { user } = await assertAdminPageAccess();
	// Independent of the active filters, so it is fetched once here rather than per tab.
	const filterOptions = await getReportingStatisticsFilterOptionsForAdmin(user);

	return (
		<ReportingStatisticsShell filterOptions={filterOptions}>{children}</ReportingStatisticsShell>
	);
}
