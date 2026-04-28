import { db } from "@dariah-eric/database";
import { Button } from "@dariah-eric/ui/button";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ReportingCampaignEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/reporting-campaign-edit-form";
import { closeReportingCampaignAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/close-reporting-campaign.action";
import { launchReportingCampaignAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/launch-reporting-campaign.action";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCampaignSettingsPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCampaignSettingsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Campaign settings"),
	});
}

function formatStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function DashboardAdministratorCampaignSettingsPage(
	props: Readonly<DashboardAdministratorCampaignSettingsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const campaign = await db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true, year: true, status: true },
	});

	if (campaign == null) {
		notFound();
	}

	const t = await getExtracted();

	return (
		<div className="flex flex-col gap-y-8">
			<ReportingCampaignEditForm campaign={campaign} />

			<div className="flex flex-col gap-y-3">
				<div className="space-y-1">
					<p className="text-sm font-medium text-fg">{t("Status")}</p>
					<p className="text-sm text-muted-fg">{formatStatus(campaign.status)}</p>
				</div>

				<div className="flex gap-x-3">
					{campaign.status === "draft" && (
						<form action={launchReportingCampaignAction}>
							<input name="id" type="hidden" value={campaign.id} />
							<Button type="submit">{t("Launch campaign")}</Button>
						</form>
					)}

					{campaign.status === "open" && (
						<form action={closeReportingCampaignAction}>
							<input name="id" type="hidden" value={campaign.id} />
							<Button intent="danger" type="submit">
								{t("Close campaign")}
							</Button>
						</form>
					)}

					{campaign.status === "closed" && (
						<p className="text-sm text-muted-fg">{t("This campaign is closed.")}</p>
					)}
				</div>
			</div>
		</div>
	);
}
