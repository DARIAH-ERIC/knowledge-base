import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CampaignServiceSizesForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/campaign-service-sizes-form";
import { upsertCampaignServiceSizesAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/upsert-campaign-service-sizes.action";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCampaignServicesPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCampaignServicesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Campaign service sizes"),
	});
}

export default async function DashboardAdministratorCampaignServicesPage(
	props: Readonly<DashboardAdministratorCampaignServicesPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const campaign = await db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true },
		with: {
			serviceSizes: {
				columns: { serviceSize: true, visitsThreshold: true, amount: true },
			},
		},
	});

	if (campaign == null) {
		notFound();
	}

	return (
		<CampaignServiceSizesForm
			campaignId={id}
			formAction={upsertCampaignServiceSizesAction}
			sizes={campaign.serviceSizes}
		/>
	);
}
