"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { ReportingCampaignForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/reporting-campaign-form";
import { createReportingCampaignAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/create-reporting-campaign.action";

export function ReportingCampaignCreateForm(): ReactNode {
	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New reporting campaign")}</Heading>

			<ReportingCampaignForm formAction={createReportingCampaignAction} />
		</Fragment>
	);
}
