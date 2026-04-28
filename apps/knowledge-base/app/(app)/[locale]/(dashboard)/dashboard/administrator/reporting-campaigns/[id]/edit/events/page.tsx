import { db } from "@dariah-eric/database";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CampaignEventAmountsForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/campaign-event-amounts-form";
import { upsertCampaignEventAmountsAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/upsert-campaign-event-amounts.action";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCampaignEventsPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCampaignEventsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Campaign event amounts"),
	});
}

export default async function DashboardAdministratorCampaignEventsPage(
	props: Readonly<DashboardAdministratorCampaignEventsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const campaign = await db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true },
		with: {
			eventAmounts: {
				columns: { eventType: true, amount: true },
			},
		},
	});

	if (campaign == null) {
		notFound();
	}

	return (
		<CampaignEventAmountsForm
			amounts={campaign.eventAmounts}
			campaignId={id}
			formAction={upsertCampaignEventAmountsAction}
		/>
	);
}
