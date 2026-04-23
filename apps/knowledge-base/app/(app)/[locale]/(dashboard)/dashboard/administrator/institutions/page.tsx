import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { InstitutionsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_components/institutions-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorInstitutionsPageProps extends PageProps<"/[locale]/dashboard/administrator/institutions"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorInstitutionsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Institutions"),
	});

	return metadata;
}

export default function DashboardAdministratorInstitutionsPage(
	_props: Readonly<DashboardAdministratorInstitutionsPageProps>,
): ReactNode {
	const institutions = db.query.organisationalUnits.findMany({
		where: { type: { type: "institution" } },
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
			<InstitutionsPage institutions={institutions} />
		</Suspense>
	);
}
