import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CountryReportUserEditContent } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_components/country-report-user-edit-content";
import { can } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingEditCountryReportPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingEditCountryReportPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Dashboard - Edit country report"),
	});

	return metadata;
}

export default async function DashboardReportingEditCountryReportPage(
	props: Readonly<DashboardReportingEditCountryReportPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const [report, { user }] = await Promise.all([
		db.query.countryReports.findFirst({
			where: { id },
			columns: { id: true, status: true },
			with: {
				campaign: { columns: { year: true } },
				country: { columns: { name: true } },
			},
		}),
		assertAuthenticated(),
	]);

	if (report == null) {
		notFound();
	}

	const canConfirm = await can(user, "confirm", { type: "country_report", id });

	return <CountryReportUserEditContent canConfirm={canConfirm} report={report} />;
}
