"use server";

import * as schema from "@dariah-eric/database/schema";

import { resolveAuditSubjectLabel } from "@/lib/data/audit-log";
import { eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";

export const deleteReportingCampaignAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "delete", subjectType: "reporting_campaigns" },
	revalidate: "/[locale]/dashboard/administrator/reporting-campaigns",

	async mutate(tx, [id]: [string]) {
		// Snapshot the label while the row still exists, so the audit log doesn't fall back to the uuid.
		const subjectLabel = await resolveAuditSubjectLabel("reporting_campaigns", id, tx);

		await tx.delete(schema.reportingCampaigns).where(eq(schema.reportingCampaigns.id, id));

		return { subjectId: id, subjectLabel };
	},
});
