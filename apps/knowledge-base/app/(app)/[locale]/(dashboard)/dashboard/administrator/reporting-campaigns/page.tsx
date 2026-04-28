import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { ReportingCampaignsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/reporting-campaigns-page";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorReportingCampaignsPageProps {
	params: Promise<{ locale: string }>;
}

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
	const campaigns = db.query.reportingCampaigns.findMany({
		orderBy: { year: "desc" },
		columns: { id: true, year: true, status: true },
	});

	return (
		<Suspense fallback={<LoadingScreen />}>
			<ReportingCampaignsPage campaigns={campaigns} />
		</Suspense>
	);
}
