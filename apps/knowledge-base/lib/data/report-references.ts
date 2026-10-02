import * as schema from "@dariah-eric/database/schema";

import type { Transaction } from "@/lib/db";
import { inArray } from "@/lib/db/sql";
import { UserFacingError } from "@/lib/user-facing-error";

/** A record that country or working group reports may point at. */
export type ReportReferenceTarget =
	| { type: "contributions"; ids: ReadonlyArray<string> }
	| { type: "document"; id: string }
	| { type: "service"; id: string }
	| { type: "social_media"; id: string };

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
	switch (target.type) {
		case "contributions": {
			if (target.ids.length === 0) {
				return false;
			}
			const ids = [...target.ids];
			return hasAny([
				tx
					.select({ id: schema.countryReportContributions.id })
					.from(schema.countryReportContributions)
					.where(inArray(schema.countryReportContributions.personToOrgUnitId, ids))
					.limit(1),
				tx
					.select({ id: schema.workingGroupReportChairs.id })
					.from(schema.workingGroupReportChairs)
					.where(inArray(schema.workingGroupReportChairs.personToOrgUnitId, ids))
					.limit(1),
			]);
		}

		case "document": {
			const ids = [target.id];
			return hasAny([
				tx
					.select({ id: schema.countryReports.id })
					.from(schema.countryReports)
					.where(inArray(schema.countryReports.countryDocumentId, ids))
					.limit(1),
				tx
					.select({ id: schema.workingGroupReports.id })
					.from(schema.workingGroupReports)
					.where(inArray(schema.workingGroupReports.workingGroupDocumentId, ids))
					.limit(1),
				tx
					.select({ id: schema.countryReportProjectContributions.id })
					.from(schema.countryReportProjectContributions)
					.where(inArray(schema.countryReportProjectContributions.projectDocumentId, ids))
					.limit(1),
				tx
					.select({ id: schema.countryReportInstitutions.id })
					.from(schema.countryReportInstitutions)
					.where(inArray(schema.countryReportInstitutions.organisationalUnitDocumentId, ids))
					.limit(1),
			]);
		}

		case "service": {
			const ids = [target.id];
			return hasAny([
				tx
					.select({ id: schema.countryReportServices.id })
					.from(schema.countryReportServices)
					.where(inArray(schema.countryReportServices.serviceId, ids))
					.limit(1),
				tx
					.select({ serviceId: schema.countryReportServiceKpis.serviceId })
					.from(schema.countryReportServiceKpis)
					.where(inArray(schema.countryReportServiceKpis.serviceId, ids))
					.limit(1),
			]);
		}

		case "social_media": {
			const ids = [target.id];
			return hasAny([
				tx
					.select({ id: schema.countryReportSocialMedia.id })
					.from(schema.countryReportSocialMedia)
					.where(inArray(schema.countryReportSocialMedia.socialMediaId, ids))
					.limit(1),
				tx
					.select({ socialMediaId: schema.countryReportSocialMediaKpis.socialMediaId })
					.from(schema.countryReportSocialMediaKpis)
					.where(inArray(schema.countryReportSocialMediaKpis.socialMediaId, ids))
					.limit(1),
				tx
					.select({ id: schema.workingGroupReportSocialMedia.id })
					.from(schema.workingGroupReportSocialMedia)
					.where(inArray(schema.workingGroupReportSocialMedia.socialMediaId, ids))
					.limit(1),
			]);
		}
	}
}

/** Runs the (lazy) queries one after another on the transaction, stopping at the first hit. */
async function hasAny(
	queries: ReadonlyArray<PromiseLike<ReadonlyArray<unknown>>>,
): Promise<boolean> {
	for (const query of queries) {
		const rows = await query;
		if (rows.length > 0) {
			return true;
		}
	}
	return false;
}
