import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CountryReportEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/country-reports/_components/country-report-edit-form";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditCountryReportPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditCountryReportPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit country report"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditCountryReportPage(
	props: Readonly<DashboardAdministratorEditCountryReportPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const report = await db.query.countryReports.findFirst({
		where: { id },
		columns: { id: true, status: true },
		with: {
			campaign: { columns: { year: true } },
			country: { columns: { name: true } },
		},
	});

	if (report == null) {
		notFound();
	}

	return <CountryReportEditForm report={report} />;
}
