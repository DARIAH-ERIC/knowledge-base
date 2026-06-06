import * as schema from "@dariah-eric/database/schema";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ReportScreenCommentSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-screen-comment-section";
import { CountryReportInstitutionsForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_components/country-report-institutions-form";
import { createCountryReportInstitutionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/create-country-report-institution.action";
import { deleteCountryReportInstitutionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/delete-country-report-institution.action";
import { getAuthorizedCountryReportForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/get-country-report-summary-data";
import { assertAuthenticated } from "@/lib/auth/session";
import { publishedEntityVersionWhere } from "@/lib/data/current-entity-version";
import { db } from "@/lib/db";
import { and, eq, inArray, notInArray, sql } from "@/lib/db/sql";

interface CountryReportInstitutionsScreenProps {
	reportId: string;
}

/**
 * Shared "institutions" screen rendered by both the reporting flow and the admin tree.
 * Self-authorizes via {@link getAuthorizedCountryReportForUser} (admins pass `can`; others get
 * `notFound`).
 */
export async function CountryReportInstitutionsScreen(
	props: Readonly<CountryReportInstitutionsScreenProps>,
): Promise<ReactNode> {
	const { reportId } = props;

	const { user } = await assertAuthenticated();
	const result = await getAuthorizedCountryReportForUser(
		user,
		reportId,
		(id) =>
			db.query.countryReports.findFirst({
				where: { id },
				columns: { id: true, countryDocumentId: true },
				with: {
					campaign: { columns: { year: true } },
					institutions: {
						columns: { id: true, organisationalUnitDocumentId: true },
						with: {
							organisationalUnit: { columns: { name: true, acronym: true } },
						},
					},
				},
			}),
		"update",
	);

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;
	if (report == null) {
		notFound();
	}

	const { year } = report.campaign;
	const claimedOrgUnitIds = report.institutions.map((i) => i.organisationalUnitDocumentId);

	const availableInstitutions = await db
		.selectDistinct({
			// institutions in a report are keyed by document id.
			id: schema.entityVersions.entityId,
			name: schema.organisationalUnits.name,
			acronym: schema.organisationalUnits.acronym,
		})
		.from(schema.organisationalUnits)
		.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.innerJoin(
			schema.organisationalUnitsRelations,
			eq(schema.organisationalUnitsRelations.unitDocumentId, schema.entityVersions.entityId),
		)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitsRelations.status, schema.organisationalUnitStatus.id),
		)
		.where(
			and(
				publishedEntityVersionWhere(),
				// unit↔unit relations and the report's country are both document-level.
				eq(schema.organisationalUnitsRelations.relatedUnitDocumentId, report.countryDocumentId),
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
					? [notInArray(schema.entityVersions.entityId, claimedOrgUnitIds)]
					: []),
			),
		)
		.orderBy(schema.organisationalUnits.name);

	return (
		<div className="flex flex-col gap-y-12">
			<CountryReportInstitutionsForm
				addAction={createCountryReportInstitutionAction}
				availableInstitutions={availableInstitutions}
				deleteAction={deleteCountryReportInstitutionAction}
				report={report}
			/>

			<ReportScreenCommentSection
				reportId={report.id}
				reportType="country"
				screenKey="institutions"
			/>
		</div>
	);
}
