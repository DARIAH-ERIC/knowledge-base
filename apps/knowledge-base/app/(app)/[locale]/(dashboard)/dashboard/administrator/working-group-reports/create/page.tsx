import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { WorkingGroupReportCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-group-reports/_components/working-group-report-create-form";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCreateWorkingGroupReportPageProps {
	params: Promise<{ locale: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCreateWorkingGroupReportPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - New working group report"),
	});

	return metadata;
}

export default async function DashboardAdministratorCreateWorkingGroupReportPage(
	_props: Readonly<DashboardAdministratorCreateWorkingGroupReportPageProps>,
): Promise<ReactNode> {
	const [campaigns, workingGroups] = await Promise.all([
		db.query.reportingCampaigns.findMany({
			orderBy: { year: "desc" },
			columns: { id: true, year: true },
		}),
		db.query.organisationalUnits.findMany({
			where: { type: { type: "working_group" } },
			orderBy: { name: "asc" },
			columns: { id: true, name: true },
		}),
	]);

	return <WorkingGroupReportCreateForm campaigns={campaigns} workingGroups={workingGroups} />;
}
