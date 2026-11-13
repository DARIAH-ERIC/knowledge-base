import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { WorkingGroupReportWelcomeScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_components/screens/working-group-report-welcome-screen";
import { resolveWorkingGroupReportId } from "@/lib/data/reporting-urls";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingWorkingGroupReportWelcomePageProps extends PageProps<"/[locale]/dashboard/reporting/working-group-reports/[year]/[slug]/edit/welcome"> {}

export async function generateMetadata(
	_props: Readonly<DashboardReportingWorkingGroupReportWelcomePageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Working group report welcome"),
	});
}

export default async function DashboardReportingWorkingGroupReportWelcomePage(
	props: Readonly<DashboardReportingWorkingGroupReportWelcomePageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { year: routeYear, slug } = await params;
	const id = await resolveWorkingGroupReportId({ year: routeYear, slug });

	if (id == null) {
		notFound();
	}

	return <WorkingGroupReportWelcomeScreen reportId={id} workingGroupSlug={slug} />;
}
