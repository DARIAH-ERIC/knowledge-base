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
import { CountryReportSummary } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_components/country-report-summary";
import { getCountryReportDataForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/get-country-report-summary-data";
import { assertAuthenticated } from "@/lib/auth/session";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingCountryReportPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Country report"),
	});
}

function formatStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function DashboardReportingCountryReportPage(
	props: Readonly<DashboardReportingCountryReportPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const { user } = await assertAuthenticated();
	const result = await getCountryReportDataForUser(user, id);

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;

	const t = await getExtracted();

	return (
		<div>
			<Header>
				<HeaderContent>
					<HeaderTitle>{report.country.name}</HeaderTitle>
					<HeaderDescription>
						{t("Campaign {year}", { year: String(report.campaign.year) })}
						{" · "}
						{formatStatus(report.status)}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<a
						className={buttonStyles({ intent: "secondary", size: "sm" })}
						download={`country-report-${id}.json`}
						href={`/api/reporting/country-reports/${id}/download`}
					>
						<ArrowDownTrayIcon className="mr-2 size-4" />
						{t("Download JSON")}
					</a>
				</HeaderAction>
			</Header>

			<div className="px-(--layout-padding) pt-6">
				<CountryReportSummary data={report.summary} />
			</div>
		</div>
	);
}
