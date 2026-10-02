import * as schema from "@dariah-eric/database/schema";

import type { Transaction } from "@/lib/db";
import { type SQLWrapper, inArray, sql } from "@/lib/db/sql";
import { UserFacingError } from "@/lib/user-facing-error";

/** A record that country or working group reports may point at. */
export type ReportReferenceTarget =
	| { type: "contributions"; ids: ReadonlyArray<string> }
	| { type: "document"; id: string }
	| { type: "service"; id: string }
	| { type: "social_media"; id: string }
	| { type: "working_group_report_question"; id: string };

/**
 * Refuses to delete a record that a country or working group report points at, whatever the
 * report's status.
 *
 * Reports record what was reported. Deleting a record they reference must never delete or rewrite
 * report rows as a side effect, so callers check here before deleting, instead of cascading. Only a
 * report's own actions (removing a row via the report, or deleting the report) change its rows.
 */
export async function assertNotReferencedByReports(
	tx: Transaction,
	target: ReportReferenceTarget,
): Promise<void> {
	if (await isReferencedByReports(tx, target)) {
		throw new UserFacingError("referenced-by-report");
	}
}

async function isReferencedByReports(
	tx: Transaction,
	target: ReportReferenceTarget,
): Promise<boolean> {
	const queries = getReportReferenceQueries(tx, target);
	if (queries.length === 0) {
		return false;
	}

	const result = await tx.execute<{ referenced: boolean }>(
		sql`select ${sql.join(
			queries.map((query) => sql`exists (${query})`),
			sql` or `,
		)} as referenced`,
	);
	return result.rows[0]?.referenced === true;
}

/** One query per report table that can point at `target`, selecting the rows that do. */
function getReportReferenceQueries(
	tx: Transaction,
	target: ReportReferenceTarget,
): Array<SQLWrapper> {
	switch (target.type) {
		case "contributions": {
			if (target.ids.length === 0) {
				return [];
			}
			const ids = [...target.ids];
			return [
				tx
					.select({ id: schema.countryReportContributions.id })
					.from(schema.countryReportContributions)
					.where(inArray(schema.countryReportContributions.personToOrgUnitId, ids)),
				tx
					.select({ id: schema.workingGroupReportChairs.id })
					.from(schema.workingGroupReportChairs)
					.where(inArray(schema.workingGroupReportChairs.personToOrgUnitId, ids)),
			];
		}

		case "document": {
			const ids = [target.id];
			return [
				tx
					.select({ id: schema.countryReports.id })
					.from(schema.countryReports)
					.where(inArray(schema.countryReports.countryDocumentId, ids)),
				tx
					.select({ id: schema.workingGroupReports.id })
					.from(schema.workingGroupReports)
					.where(inArray(schema.workingGroupReports.workingGroupDocumentId, ids)),
				tx
					.select({ id: schema.countryReportProjectContributions.id })
					.from(schema.countryReportProjectContributions)
					.where(inArray(schema.countryReportProjectContributions.projectDocumentId, ids)),
				tx
					.select({ id: schema.countryReportInstitutions.id })
					.from(schema.countryReportInstitutions)
					.where(inArray(schema.countryReportInstitutions.organisationalUnitDocumentId, ids)),
			];
		}

		case "service": {
			const ids = [target.id];
			return [
				tx
					.select({ id: schema.countryReportServices.id })
					.from(schema.countryReportServices)
					.where(inArray(schema.countryReportServices.serviceId, ids)),
				tx
					.select({ serviceId: schema.countryReportServiceKpis.serviceId })
					.from(schema.countryReportServiceKpis)
					.where(inArray(schema.countryReportServiceKpis.serviceId, ids)),
			];
		}

		case "working_group_report_question": {
			return [
				tx
					.select({ id: schema.workingGroupReportAnswers.id })
					.from(schema.workingGroupReportAnswers)
					.where(inArray(schema.workingGroupReportAnswers.questionId, [target.id])),
			];
		}

		case "social_media": {
			const ids = [target.id];
			return [
				tx
					.select({ id: schema.countryReportSocialMedia.id })
					.from(schema.countryReportSocialMedia)
					.where(inArray(schema.countryReportSocialMedia.socialMediaId, ids)),
				tx
					.select({ socialMediaId: schema.countryReportSocialMediaKpis.socialMediaId })
					.from(schema.countryReportSocialMediaKpis)
					.where(inArray(schema.countryReportSocialMediaKpis.socialMediaId, ids)),
				tx
					.select({ id: schema.workingGroupReportSocialMedia.id })
					.from(schema.workingGroupReportSocialMedia)
					.where(inArray(schema.workingGroupReportSocialMedia.socialMediaId, ids)),
			];
		}
	}
}
