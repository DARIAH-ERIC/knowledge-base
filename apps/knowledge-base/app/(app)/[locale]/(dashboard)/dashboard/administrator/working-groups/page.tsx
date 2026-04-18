import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { WorkingGroupsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-groups-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorWorkingGroupsPageProps extends PageProps<"/[locale]/dashboard/administrator/working-groups"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorWorkingGroupsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Working groups"),
	});

	return metadata;
}

export default function DashboardAdministratorWorkingGroupsPage(
	_props: Readonly<DashboardAdministratorWorkingGroupsPageProps>,
): ReactNode {
	const workingGroups = db.query.workingGroups.findMany({
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
			<WorkingGroupsPage workingGroups={workingGroups} />
		</Suspense>
	);
}
