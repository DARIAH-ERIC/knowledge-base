import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CountryReportWelcomeScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_components/screens/country-report-welcome-screen";
import { resolveCountryReportId } from "@/lib/data/reporting-urls";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingCountryReportWelcomePageProps extends PageProps<"/[locale]/dashboard/reporting/country-reports/[year]/[slug]/edit/welcome"> {}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportWelcomePageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Country report welcome"),
	});
}

export default async function DashboardReportingCountryReportWelcomePage(
	props: Readonly<DashboardReportingCountryReportWelcomePageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { year: routeYear, slug } = await params;
	const id = await resolveCountryReportId({ year: routeYear, slug });

	if (id == null) {
		notFound();
	}

	return <CountryReportWelcomeScreen countrySlug={slug} reportId={id} />;
}
