"use server";

import * as schema from "@dariah-eric/database/schema";

import { resolveAuditSubjectLabel } from "@/lib/data/audit-log";
import { and, eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";

export const deleteCountryReportAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "delete", subjectType: "country_reports" },
	revalidate: "/[locale]/dashboard/administrator/country-reports",

	async mutate(tx, [id]: [string]) {
		// Snapshot the label while the row still exists, so the audit log doesn't fall back to the uuid.
		const subjectLabel = await resolveAuditSubjectLabel("country_reports", id, tx);

		await tx
			.delete(schema.reportScreenComments)
			.where(
				and(
					eq(schema.reportScreenComments.reportType, "country"),
					eq(schema.reportScreenComments.reportId, id),
				),
			);
		await tx
			.delete(schema.countryReportContributions)
			.where(eq(schema.countryReportContributions.countryReportId, id));
		await tx
			.delete(schema.countryReportSocialMediaKpis)
			.where(eq(schema.countryReportSocialMediaKpis.countryReportId, id));
		await tx
			.delete(schema.countryReportSocialMedia)
			.where(eq(schema.countryReportSocialMedia.countryReportId, id));
		await tx
			.delete(schema.countryReportServiceKpis)
			.where(eq(schema.countryReportServiceKpis.countryReportId, id));
		await tx
			.delete(schema.countryReportServices)
			.where(eq(schema.countryReportServices.countryReportId, id));
		await tx
			.delete(schema.countryReportProjectContributions)
			.where(eq(schema.countryReportProjectContributions.countryReportId, id));
		await tx
			.delete(schema.countryReportInstitutions)
			.where(eq(schema.countryReportInstitutions.countryReportId, id));
		await tx.delete(schema.countryReports).where(eq(schema.countryReports.id, id));

		return { subjectId: id, subjectLabel };
	},
});
