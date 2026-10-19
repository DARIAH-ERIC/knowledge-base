import { EmptyState } from "@dariah-eric/ui/empty-state";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
	ReportHistoryList,
	formatReportStatus,
	isReportHistoryItemEditable,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-history-list";
import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { getCountryReportHistory } from "@/lib/data/reporting";
import { getUserOrganisationalUnitScopes } from "@/lib/data/user-organisational-units";
import { createMetadata } from "@/lib/server/create-metadata";

interface CountryReportsPageProps extends PageProps<"/[locale]/dashboard/countries/[code]/reports"> {}

export async function generateMetadata(
	_props: Readonly<CountryReportsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, { title: t("Country reports") });
}

export default async function CountryReportsPage(
	props: Readonly<CountryReportsPageProps>,
): Promise<ReactNode> {
	const [{ code }, { user }] = await Promise.all([props.params, assertAuthenticated()]);

	const scopes = await getUserOrganisationalUnitScopes(user);
	const country = scopes.countries.find((item) => item.slug === code);

	if (country == null) {
		notFound();
	}

	await assertCan(user, "read", { type: "organisational_unit", id: country.documentId });

	const [reports, t] = await Promise.all([
		getCountryReportHistory(country.documentId),
		getExtracted(),
	]);

	if (reports.length === 0) {
		return (
			<EmptyState
				description={t("There are no reports for {name} yet.", { name: country.name })}
				title={t("No reports yet")}
			/>
		);
	}

	return (
		<ReportHistoryList
			items={reports.map((report) => {
				return {
					id: report.reportId,
					title: String(report.campaignYear),
					description: formatReportStatus(report.reportStatus),
					href: report.reportHref,
					editHref: isReportHistoryItemEditable(report) ? `${report.reportHref}/edit` : null,
				};
			})}
		/>
	);
}
