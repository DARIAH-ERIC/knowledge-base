import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CampaignQuestionsForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/campaign-questions-form";
import { createWorkingGroupReportQuestionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/create-working-group-report-question.action";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCampaignQuestionsPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCampaignQuestionsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Campaign questions"),
	});
}

export default async function DashboardAdministratorCampaignQuestionsPage(
	props: Readonly<DashboardAdministratorCampaignQuestionsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const campaign = await db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true },
		with: {
			workingGroupReportQuestions: {
				columns: { id: true, question: true, position: true },
				orderBy: { position: "asc" },
			},
		},
	});

	if (campaign == null) {
		notFound();
	}

	return (
		<CampaignQuestionsForm
			campaignId={id}
			createAction={createWorkingGroupReportQuestionAction}
			questions={campaign.workingGroupReportQuestions}
		/>
	);
}
