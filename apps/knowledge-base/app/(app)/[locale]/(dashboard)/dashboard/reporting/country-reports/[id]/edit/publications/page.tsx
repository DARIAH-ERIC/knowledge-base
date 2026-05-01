import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ReportScreenCommentSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-screen-comment-section";
import { getAuthorizedCountryReportForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/get-country-report-summary-data";
import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingCountryReportPublicationsPageProps extends PageProps<"/[locale]/dashboard/reporting/country-reports/[id]/edit/publications"> {}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportPublicationsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Country report publications"),
	});
}

export default async function DashboardReportingCountryReportPublicationsPage(
	props: Readonly<DashboardReportingCountryReportPublicationsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const { user } = await assertAuthenticated();
	const result = await getAuthorizedCountryReportForUser(
		user,
		id,
		(id) => {
			return db.query.countryReports.findFirst({
				where: { id },
				columns: { id: true },
			});
		},
		"update",
	);

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;
	if (report == null) {
		notFound();
	}

	const t = await getExtracted();

	return (
		<div className="flex flex-col gap-y-12">
			<div className="flex flex-col gap-y-4">
				<p className="text-sm text-muted-fg">{t("Publications from the Zotero library.")}</p>
				<p className="text-sm text-muted-fg italic">{t("Coming soon.")}</p>
			</div>

			<ReportScreenCommentSection
				reportId={report.id}
				reportType="country"
				screenKey="publications"
			/>
		</div>
	);
}
