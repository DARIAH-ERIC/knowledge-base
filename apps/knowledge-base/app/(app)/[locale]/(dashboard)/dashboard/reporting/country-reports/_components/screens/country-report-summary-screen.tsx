import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CountryReportSummary } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_components/country-report-summary";
import { getCountryReportDataForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/get-country-report-summary-data";
import { assertAuthenticated } from "@/lib/auth/session";

interface CountryReportSummaryScreenProps {
	reportId: string;
}

export async function CountryReportSummaryScreen(
	props: Readonly<CountryReportSummaryScreenProps>,
): Promise<ReactNode> {
	const { reportId } = props;

	const { user } = await assertAuthenticated();
	const result = await getCountryReportDataForUser(user, reportId, "update");

	if (result.status !== "ok") {
		notFound();
	}

	return (
		<div className="flex flex-col gap-y-10">
			<CountryReportSummary data={result.data.summary} />
		</div>
	);
}
