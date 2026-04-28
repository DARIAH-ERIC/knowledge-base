import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { CountryReportsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/country-reports/_components/country-reports-page";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCountryReportsPageProps {
	params: Promise<{ locale: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCountryReportsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Country reports"),
	});

	return metadata;
}

export default function DashboardAdministratorCountryReportsPage(
	_props: Readonly<DashboardAdministratorCountryReportsPageProps>,
): ReactNode {
	const reports = db.query.countryReports.findMany({
		columns: { id: true, status: true },
		with: {
			campaign: { columns: { id: true, year: true } },
			country: { columns: { id: true, name: true } },
		},
	});

	return (
		<Suspense fallback={<LoadingScreen />}>
			<CountryReportsPage reports={reports} />
		</Suspense>
	);
}
