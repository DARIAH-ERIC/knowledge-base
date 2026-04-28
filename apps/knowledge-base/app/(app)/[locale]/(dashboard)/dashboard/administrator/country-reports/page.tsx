import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { CountryReportsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/country-reports/_components/country-reports-page";
import { assertAuthenticated } from "@/lib/auth/session";
import { getCountryReportsForAdmin } from "@/lib/data/admin-reporting";
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
	const reports = assertAuthenticated().then(({ user }) => {
		return getCountryReportsForAdmin(user);
	});

	return (
		<Suspense fallback={<LoadingScreen />}>
			<CountryReportsPage reports={reports} />
		</Suspense>
	);
}
