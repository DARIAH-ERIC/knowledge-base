import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ReportingCampaignEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/reporting-campaign-edit-form";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditReportingCampaignPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditReportingCampaignPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit reporting campaign"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditReportingCampaignPage(
	props: Readonly<DashboardAdministratorEditReportingCampaignPageProps>,
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

	return <ReportingCampaignEditForm campaign={campaign} />;
}
