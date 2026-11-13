import { Note } from "@dariah-eric/ui/note";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CampaignStatusActionForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/campaign-status-action-form";
import { ReportingCampaignEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/reporting-campaign-edit-form";
import { getCampaignReadinessMessages } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/campaign-readiness";
import { closeReportingCampaignAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/close-reporting-campaign.action";
import { launchReportingCampaignAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/launch-reporting-campaign.action";
import { assertAuthenticated } from "@/lib/auth/session";
import { getReportingCampaignSettingsForAdmin } from "@/lib/data/admin-reporting";
import { getReportingCampaignReadiness } from "@/lib/data/reporting-campaign-readiness";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCampaignSettingsPageProps extends PageProps<"/[locale]/dashboard/administrator/reporting-campaigns/[id]/edit/settings"> {}

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

	const { user } = await assertAuthenticated();
	const campaign = await getReportingCampaignSettingsForAdmin(user, id);

	if (campaign == null) {
		notFound();
	}

	const t = await getExtracted();

	const readiness =
		campaign.status === "draft" ? await getReportingCampaignReadiness(campaign.id) : null;
	const readinessMessages =
		readiness != null ? await getCampaignReadinessMessages(readiness) : null;

	return (
		<div className="flex flex-col gap-y-8">
			<ReportingCampaignEditForm campaign={campaign} />

			<div className="flex flex-col gap-y-3">
				<div className="space-y-1">
					<p className="text-sm font-medium text-fg">{t("Status")}</p>
					<p className="text-sm text-muted-fg">{formatStatus(campaign.status)}</p>
				</div>

				{readinessMessages != null && readinessMessages.errors.length > 0 && (
					<Note intent="danger">
						<p>{t("Fix these before launching the campaign:")}</p>
						<ul className="list-disc ps-5">
							{readinessMessages.errors.map((message) => (
								<li key={message}>{message}</li>
							))}
						</ul>
					</Note>
				)}

				{readinessMessages != null && readinessMessages.warnings.length > 0 && (
					<Note intent="warning">
						<p>{t("You can launch the campaign, but check these first:")}</p>
						<ul className="list-disc ps-5">
							{readinessMessages.warnings.map((message) => (
								<li key={message}>{message}</li>
							))}
						</ul>
					</Note>
				)}

				{readiness != null && (
					<p className="text-sm text-muted-fg">
						{t(
							"Launching the campaign creates draft reports for {countries} countries and {workingGroups} working groups.",
							{
								countries: String(readiness.countryCount),
								workingGroups: String(readiness.workingGroupCount),
							},
						)}
					</p>
				)}

				<div className="flex gap-x-3">
					{campaign.status === "draft" && (
						<CampaignStatusActionForm
							action={launchReportingCampaignAction}
							campaignId={campaign.id}
							isDisabled={readiness?.isReady !== true}
							label={t("Launch campaign")}
						/>
					)}

					{campaign.status === "open" && (
						<CampaignStatusActionForm
							action={closeReportingCampaignAction}
							campaignId={campaign.id}
							intent="danger"
							label={t("Close campaign")}
						/>
					)}

					{campaign.status === "closed" && (
						<p className="text-sm text-muted-fg">{t("This campaign is closed.")}</p>
					)}
				</div>
			</div>
		</div>
	);
}
