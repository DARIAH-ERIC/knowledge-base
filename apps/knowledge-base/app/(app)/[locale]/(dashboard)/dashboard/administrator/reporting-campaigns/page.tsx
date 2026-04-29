import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { ReportingCampaignsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/reporting-campaigns-page";
import { assertAuthenticated } from "@/lib/auth/session";
import { getReportingCampaignsForAdmin } from "@/lib/data/admin-reporting";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorReportingCampaignsPageProps extends PageProps<"/[locale]/dashboard/administrator/reporting-campaigns"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorReportingCampaignsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Reporting campaigns"),
	});

	return metadata;
}

export default function DashboardAdministratorReportingCampaignsPage(
	_props: Readonly<DashboardAdministratorReportingCampaignsPageProps>,
): ReactNode {
	const campaigns = assertAuthenticated().then(({ user }) => {
		return getReportingCampaignsForAdmin(user);
	});

	return (
		<Suspense fallback={<LoadingScreen />}>
			<ReportingCampaignsPage campaigns={campaigns} />
		</Suspense>
	);
}
