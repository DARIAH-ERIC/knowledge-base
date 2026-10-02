"use server";

import * as schema from "@dariah-eric/database/schema";

import { resolveAuditSubjectLabel } from "@/lib/data/audit-log";
import { eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const deleteProjectPartnerAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "delete", subjectType: "project_partners" },
	revalidate: "/[locale]/dashboard/administrator",

	async mutate(tx, [id]: [string]) {
		// Snapshot the label while the row still exists, so the audit log doesn't fall back to the uuid.
		const subjectLabel = await resolveAuditSubjectLabel("project_partners", id, tx);

		await tx
			.delete(schema.projectsToOrganisationalUnits)
			.where(eq(schema.projectsToOrganisationalUnits.id, id));

		return { subjectId: id, subjectLabel };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["projects"] });
	},
});
