import { getLocale } from "next-intl/server";

import { redirect } from "@/lib/navigation/navigation";

interface DashboardReportingEditWorkingGroupReportPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export default async function DashboardReportingEditWorkingGroupReportPage(
	props: Readonly<DashboardReportingEditWorkingGroupReportPageProps>,
): Promise<never> {
	const { params } = props;

	const { id } = await params;
	const locale = await getLocale();

	redirect({ href: `/dashboard/reporting/working-group-reports/${id}/edit/data`, locale });
}
