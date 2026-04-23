import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { PersonsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_components/persons-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorPersonsPageProps extends PageProps<"/[locale]/dashboard/administrator/persons"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorPersonsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Persons"),
	});

	return metadata;
}

export default function DashboardAdministratorPersonsPage(
	_props: Readonly<DashboardAdministratorPersonsPageProps>,
): ReactNode {
	const persons = db.query.persons.findMany({
		orderBy: {
			sortName: "asc",
		},
		columns: {
			email: true,
			id: true,
			name: true,
			orcid: true,
			position: true,
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
			<PersonsPage persons={persons} />
		</Suspense>
	);
}
