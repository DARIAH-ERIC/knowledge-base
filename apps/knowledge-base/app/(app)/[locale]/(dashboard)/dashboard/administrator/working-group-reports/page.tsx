import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { WorkingGroupReportsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-group-reports/_components/working-group-reports-page";
import { assertAuthenticated } from "@/lib/auth/session";
import { getWorkingGroupReportsForAdmin } from "@/lib/data/admin-reporting";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorWorkingGroupReportsPageProps extends PageProps<"/[locale]/dashboard/administrator/working-group-reports"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorWorkingGroupReportsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Working group reports"),
	});

	return metadata;
}

export default function DashboardAdministratorWorkingGroupReportsPage(
	_props: Readonly<DashboardAdministratorWorkingGroupReportsPageProps>,
): ReactNode {
	const reports = assertAuthenticated().then(({ user }) => {
		return getWorkingGroupReportsForAdmin(user);
	});

	return (
		<Suspense fallback={<LoadingScreen />}>
			<WorkingGroupReportsPage reports={reports} />
		</Suspense>
	);
}
