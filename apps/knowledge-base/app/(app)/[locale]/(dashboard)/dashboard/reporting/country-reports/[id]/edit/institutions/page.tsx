import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CountryReportInstitutionsForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_components/country-report-institutions-form";
import { createCountryReportInstitutionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/create-country-report-institution.action";
import { deleteCountryReportInstitutionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/delete-country-report-institution.action";
import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { and, eq, inArray, notInArray, sql } from "@/lib/db/sql";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingCountryReportInstitutionsPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportInstitutionsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Country report institutions"),
	});
}

export default async function DashboardReportingCountryReportInstitutionsPage(
	props: Readonly<DashboardReportingCountryReportInstitutionsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const [report] = await Promise.all([
		db.query.countryReports.findFirst({
			where: { id },
			columns: { id: true },
			with: {
				campaign: { columns: { year: true } },
				country: { columns: { id: true } },
				institutions: {
					columns: { id: true, organisationalUnitId: true },
					with: {
						organisationalUnit: { columns: { name: true, acronym: true } },
					},
				},
			},
		}),
		assertAuthenticated(),
	]);

	if (report == null) {
		notFound();
	}

	const { year } = report.campaign;
	const claimedOrgUnitIds = report.institutions.map((i) => {
		return i.organisationalUnitId;
	});

	const availableInstitutions = await db
		.selectDistinct({
			id: schema.organisationalUnits.id,
			name: schema.organisationalUnits.name,
			acronym: schema.organisationalUnits.acronym,
		})
		.from(schema.organisationalUnits)
		.innerJoin(
			schema.organisationalUnitsRelations,
			eq(schema.organisationalUnitsRelations.unitId, schema.organisationalUnits.id),
		)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitsRelations.status, schema.organisationalUnitStatus.id),
		)
		.where(
			and(
				eq(schema.organisationalUnitsRelations.relatedUnitId, report.country.id),
				inArray(schema.organisationalUnitStatus.status, [
					"is_partner_institution_of",
					"is_national_coordinating_institution_in",
					"is_national_representative_institution_in",
				]),
				sql`
					${schema.organisationalUnitsRelations.duration} && tstzrange (
						MAKE_DATE(${year}, 1, 1)::TIMESTAMPTZ,
						MAKE_DATE(${year + 1}, 1, 1)::TIMESTAMPTZ
					)
				`,
				...(claimedOrgUnitIds.length > 0
					? [notInArray(schema.organisationalUnits.id, claimedOrgUnitIds)]
					: []),
			),
		)
		.orderBy(schema.organisationalUnits.name);

	return (
		<CountryReportInstitutionsForm
			addAction={createCountryReportInstitutionAction}
			availableInstitutions={availableInstitutions}
			deleteAction={deleteCountryReportInstitutionAction}
			report={report}
		/>
	);
}
