import { db } from "@dariah-eric/database";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CampaignSocialMediaAmountsForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/campaign-social-media-amounts-form";
import { upsertCampaignSocialMediaAmountsAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/upsert-campaign-social-media-amounts.action";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCampaignSocialMediaPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCampaignSocialMediaPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Campaign social media amounts"),
	});
}

export default async function DashboardAdministratorCampaignSocialMediaPage(
	props: Readonly<DashboardAdministratorCampaignSocialMediaPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const campaign = await db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true },
		with: {
			socialMediaAmounts: {
				columns: { category: true, amount: true },
			},
		},
	});

	if (campaign == null) {
		notFound();
	}

	return (
		<CampaignSocialMediaAmountsForm
			amounts={campaign.socialMediaAmounts}
			campaignId={id}
			formAction={upsertCampaignSocialMediaAmountsAction}
		/>
	);
}
