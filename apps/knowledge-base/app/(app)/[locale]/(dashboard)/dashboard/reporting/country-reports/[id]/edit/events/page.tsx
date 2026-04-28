import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CountryReportEventsForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_components/country-report-events-form";
import { updateCountryReportEventsAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/update-country-report-events.action";
import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingCountryReportEventsPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportEventsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Country report events"),
	});
}

export default async function DashboardReportingCountryReportEventsPage(
	props: Readonly<DashboardReportingCountryReportEventsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const [report] = await Promise.all([
		db.query.countryReports.findFirst({
			where: { id },
			columns: {
				id: true,
				smallEvents: true,
				mediumEvents: true,
				largeEvents: true,
				veryLargeEvents: true,
				dariahCommissionedEvent: true,
				reusableOutcomes: true,
			},
		}),
		assertAuthenticated(),
	]);

	if (report == null) {
		notFound();
	}

	return <CountryReportEventsForm formAction={updateCountryReportEventsAction} report={report} />;
}
