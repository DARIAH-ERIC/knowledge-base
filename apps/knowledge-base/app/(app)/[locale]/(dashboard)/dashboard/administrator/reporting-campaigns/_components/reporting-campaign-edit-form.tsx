"use client";

import type { ReactNode } from "react";

import { ReportingCampaignForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/reporting-campaign-form";
import { updateReportingCampaignAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/update-reporting-campaign.action";
import type * as schema from "@dariah-eric/database/schema";

interface ReportingCampaignEditFormProps {
	campaign: Pick<schema.ReportingCampaign, "id" | "year" | "status">;
}

export function ReportingCampaignEditForm(
	props: Readonly<ReportingCampaignEditFormProps>,
): ReactNode {
	const { campaign } = props;

	return (
		<ReportingCampaignForm
			key={campaign.status}
			campaign={campaign}
			formAction={updateReportingCampaignAction}
		/>
	);
}
