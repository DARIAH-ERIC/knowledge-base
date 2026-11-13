import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ReportingCampaignCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/reporting-campaign-create-form";
import { assertAuthenticated } from "@/lib/auth/session";
import { getReportingCampaignCreateDataForAdmin } from "@/lib/data/admin-reporting";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCreateReportingCampaignPageProps extends PageProps<"/[locale]/dashboard/administrator/reporting-campaigns/create"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCreateReportingCampaignPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - New reporting campaign"),
	});

	return metadata;
}

export default async function DashboardAdministratorCreateReportingCampaignPage(
	_props: Readonly<DashboardAdministratorCreateReportingCampaignPageProps>,
): Promise<ReactNode> {
	const { user } = await assertAuthenticated();
	const { defaultYear } = await getReportingCampaignCreateDataForAdmin(user);

	return <ReportingCampaignCreateForm defaultYear={defaultYear} />;
}
