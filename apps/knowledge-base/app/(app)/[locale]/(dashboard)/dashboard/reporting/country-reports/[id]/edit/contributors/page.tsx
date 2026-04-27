import { and, eq, inArray, notInArray, or, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CountryReportClaimedContributorsForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_components/country-report-claimed-contributors-form";
import { CountryReportContributorsForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_components/country-report-contributors-form";
import { createCountryReportContributionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/create-country-report-contribution.action";
import { deleteCountryReportContributionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/delete-country-report-contribution.action";
import { updateCountryReportContributorsAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/update-country-report-contributors.action";
import { assertAuthenticated } from "@/lib/auth/session";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingCountryReportContributorsPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportContributorsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Country report contributors"),
	});
}

export default async function DashboardReportingCountryReportContributorsPage(
	props: Readonly<DashboardReportingCountryReportContributorsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const [report] = await Promise.all([
		db.query.countryReports.findFirst({
			where: { id },
			columns: { id: true, totalContributors: true },
			with: {
				campaign: { columns: { year: true } },
				country: { columns: { id: true } },
				contributions: {
					columns: { id: true },
					with: {
						personToOrgUnit: {
							columns: { id: true },
							with: {
								person: { columns: { name: true } },
								organisationalUnit: { columns: { name: true } },
								roleType: { columns: { type: true } },
							},
						},
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
	const claimedIds = report.contributions.map((c) => {
		return c.personToOrgUnit.id;
	});

	const availablePersonToOrgUnits = await db
		.select({
			id: schema.personsToOrganisationalUnits.id,
			personName: schema.persons.name,
			orgUnitName: schema.organisationalUnits.name,
			roleType: schema.personRoleTypes.type,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(schema.persons, eq(schema.personsToOrganisationalUnits.personId, schema.persons.id))
		.innerJoin(
			schema.organisationalUnits,
			eq(schema.personsToOrganisationalUnits.organisationalUnitId, schema.organisationalUnits.id),
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
		)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personsToOrganisationalUnits.roleTypeId, schema.personRoleTypes.id),
		)
		.where(
			and(
				or(
					and(
						inArray(schema.personRoleTypes.type, [
							"national_coordinator",
							"national_coordinator_deputy",
							"national_representative",
							"national_representative_deputy",
						]),
						eq(schema.personsToOrganisationalUnits.organisationalUnitId, report.country.id),
					),
					and(
						inArray(schema.personRoleTypes.type, ["is_chair_of", "is_vice_chair_of"]),
						eq(schema.organisationalUnitTypes.type, "working_group"),
					),
					and(
						eq(schema.personRoleTypes.type, "is_member_of"),
						eq(schema.organisationalUnitTypes.type, "governance_body"),
					),
				),
				sql`
					${schema.personsToOrganisationalUnits.duration} && tstzrange (
						MAKE_DATE(${year}, 1, 1)::TIMESTAMPTZ,
						MAKE_DATE(${year + 1}, 1, 1)::TIMESTAMPTZ
					)
				`,
				...(claimedIds.length > 0
					? [notInArray(schema.personsToOrganisationalUnits.id, claimedIds)]
					: []),
			),
		)
		.orderBy(schema.persons.sortName, schema.personRoleTypes.type);

	return (
		<div className="flex flex-col gap-y-12">
			<CountryReportClaimedContributorsForm
				addAction={createCountryReportContributionAction}
				availablePersonToOrgUnits={availablePersonToOrgUnits}
				deleteAction={deleteCountryReportContributionAction}
				report={report}
			/>
			<CountryReportContributorsForm
				formAction={updateCountryReportContributorsAction}
				report={report}
			/>
		</div>
	);
}
