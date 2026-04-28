import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CountryReportProjectsForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_components/country-report-projects-form";
import { createCountryReportProjectContributionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/create-country-report-project-contribution.action";
import { deleteCountryReportProjectContributionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/delete-country-report-project-contribution.action";
import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingCountryReportProjectsPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportProjectsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Country report project contributions"),
	});
}

export default async function DashboardReportingCountryReportProjectsPage(
	props: Readonly<DashboardReportingCountryReportProjectsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const [report, allProjects] = await Promise.all([
		db.query.countryReports.findFirst({
			where: { id },
			columns: { id: true },
			with: {
				projectContributions: {
					columns: { id: true, amountEuros: true },
					with: {
						project: { columns: { id: true, name: true } },
					},
				},
			},
		}),
		db.query.projects.findMany({
			columns: { id: true, name: true },
			orderBy: { name: "asc" },
		}),
		assertAuthenticated(),
	]);

	if (report == null) {
		notFound();
	}

	return (
		<CountryReportProjectsForm
			addAction={createCountryReportProjectContributionAction}
			allProjects={allProjects}
			deleteAction={deleteCountryReportProjectContributionAction}
			report={report}
		/>
	);
}
