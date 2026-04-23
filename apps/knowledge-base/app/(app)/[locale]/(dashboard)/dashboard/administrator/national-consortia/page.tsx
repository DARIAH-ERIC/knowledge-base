import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { NationalConsortiaPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_components/national-consortia-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorNationalConsortiaPageProps extends PageProps<"/[locale]/dashboard/administrator/national-consortia"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorNationalConsortiaPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - National consortia"),
	});

	return metadata;
}

export default function DashboardAdministratorNationalConsortiaPage(
	_props: Readonly<DashboardAdministratorNationalConsortiaPageProps>,
): ReactNode {
	const nationalConsortia = db.query.organisationalUnits.findMany({
		where: { type: { type: "national_consortium" } },
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
			<NationalConsortiaPage nationalConsortia={nationalConsortia} />
		</Suspense>
	);
}
