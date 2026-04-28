import { db } from "@dariah-eric/database";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CampaignContributionAmountsForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/campaign-contribution-amounts-form";
import { upsertCampaignContributionAmountsAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/upsert-campaign-contribution-amounts.action";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCampaignContributionsPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCampaignContributionsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Campaign contribution amounts"),
	});
}

export default async function DashboardAdministratorCampaignContributionsPage(
	props: Readonly<DashboardAdministratorCampaignContributionsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const campaign = await db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true },
		with: {
			contributionAmounts: {
				columns: { roleType: true, amount: true },
			},
		},
	});

	if (campaign == null) {
		notFound();
	}

	return (
		<CampaignContributionAmountsForm
			amounts={campaign.contributionAmounts}
			campaignId={id}
			formAction={upsertCampaignContributionAmountsAction}
		/>
	);
}
