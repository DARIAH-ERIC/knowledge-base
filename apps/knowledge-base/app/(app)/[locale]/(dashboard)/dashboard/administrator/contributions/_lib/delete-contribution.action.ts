"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import { assertCan } from "@/lib/auth/permissions";
import { resolveAuditSubjectLabel } from "@/lib/data/audit-log";
import { assertNotReferencedByReports } from "@/lib/data/report-references";
import { eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { UserFacingError } from "@/lib/user-facing-error";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const deleteContributionAction = createCommandAction({
	requireAuth: true,
	audit: { action: "delete", subjectType: "contributions" },
	revalidate: [
		"/[locale]/dashboard/administrator/contributions",
		"/[locale]/dashboard/administrator/person-relations",
	],

	async mutate(tx, [id]: [string], ctx) {
		assert(ctx.user, "Not authenticated.");

		const contribution = await tx.query.personsToOrganisationalUnits.findFirst({
			where: { id },
			columns: { organisationalUnitDocumentId: true },
		});
		if (contribution == null) {
			throw new UserFacingError("record-not-found");
		}

		// Admins always pass; delegated callers may only manage people on units they are scoped to edit.
		await assertCan(ctx.user, "update", {
			type: "organisational_unit",
			id: contribution.organisationalUnitDocumentId,
		});

		await assertNotReferencedByReports(tx, { type: "contributions", ids: [id] });

		// Snapshot the label while the row still exists, so the audit log doesn't fall back to the uuid.
		const subjectLabel = await resolveAuditSubjectLabel("contributions", id, tx);

		await tx
			.delete(schema.personsToOrganisationalUnits)
			.where(eq(schema.personsToOrganisationalUnits.id, id));

		return { subjectId: id, subjectLabel };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["persons"] });
	},
});
