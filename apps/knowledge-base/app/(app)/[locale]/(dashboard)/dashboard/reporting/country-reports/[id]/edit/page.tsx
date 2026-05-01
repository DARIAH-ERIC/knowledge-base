import { getLocale } from "next-intl/server";

import { redirect } from "@/lib/navigation/navigation";

interface DashboardReportingEditCountryReportPageProps extends PageProps<"/[locale]/dashboard/reporting/country-reports/[id]/edit"> {}

export default async function DashboardReportingEditCountryReportPage(
	props: Readonly<DashboardReportingEditCountryReportPageProps>,
): Promise<never> {
	const { params } = props;

	const { id } = await params;
	const locale = await getLocale();

	redirect({ href: `/dashboard/reporting/country-reports/${id}/edit/institutions`, locale });
}
