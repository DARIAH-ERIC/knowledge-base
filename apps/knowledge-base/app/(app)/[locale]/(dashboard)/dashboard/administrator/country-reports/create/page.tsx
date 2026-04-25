import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CountryReportCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/country-reports/_components/country-report-create-form";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCreateCountryReportPageProps {
	params: Promise<{ locale: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCreateCountryReportPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - New country report"),
	});

	return metadata;
}

export default async function DashboardAdministratorCreateCountryReportPage(
	_props: Readonly<DashboardAdministratorCreateCountryReportPageProps>,
): Promise<ReactNode> {
	const [campaigns, countries] = await Promise.all([
		db.query.reportingCampaigns.findMany({
			orderBy: { year: "desc" },
			columns: { id: true, year: true },
		}),
		db.query.organisationalUnits.findMany({
			where: { type: { type: "country" } },
			orderBy: { name: "asc" },
			columns: { id: true, name: true },
		}),
	]);

	return <CountryReportCreateForm campaigns={campaigns} countries={countries} />;
}
