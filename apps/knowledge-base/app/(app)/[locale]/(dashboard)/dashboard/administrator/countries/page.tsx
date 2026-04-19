import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { CountriesPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_components/countries-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCountriesPageProps extends PageProps<"/[locale]/dashboard/administrator/countries"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCountriesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Countries"),
	});

	return metadata;
}

export default function DashboardAdministratorCountriesPage(
	_props: Readonly<DashboardAdministratorCountriesPageProps>,
): ReactNode {
	const countries = db.query.organisationalUnits.findMany({
		where: { type: { type: "country" } },
		orderBy: { name: "asc" },
		columns: {
			id: true,
			name: true,
		},
		with: {
			entity: {
				columns: {
					documentId: true,
					slug: true,
				},
				with: {
					status: {
						columns: {
							id: true,
							type: true,
						},
					},
				},
			},
		},
	});

	return (
		<Suspense fallback={<LoadingScreen />}>
			<CountriesPage countries={countries} />
		</Suspense>
	);
}
