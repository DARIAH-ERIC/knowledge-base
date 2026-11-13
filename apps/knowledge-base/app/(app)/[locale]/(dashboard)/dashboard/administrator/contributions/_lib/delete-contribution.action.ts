"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import { assertCan } from "@/lib/auth/permissions";
import { resolveAuditSubjectLabel } from "@/lib/data/audit-log";
import { assertNotReferencedByReports } from "@/lib/data/report-references";
import { eq } from "@/lib/db/sql";
import {
	describePersonRelation,
	isDelegatedChange,
	sendRelationChangeNotification,
} from "@/lib/email/send-delegated-change-notification";
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

		// Described while the row still exists, for the notification sent after the commit.
		const deletedRelation = isDelegatedChange(ctx.user, ctx.realUser)
			? await describePersonRelation(id, tx)
			: null;

		await tx
			.delete(schema.personsToOrganisationalUnits)
			.where(eq(schema.personsToOrganisationalUnits.id, id));

		return { subjectId: id, subjectLabel, deletedRelation };
	},

	async postCommit({ result, ctx }) {
		await dispatchWebhook({ tags: ["persons"] });
		if (result.deletedRelation != null && ctx.user != null) {
			await sendRelationChangeNotification({
				change: "deleted",
				relation: result.deletedRelation,
				actor: ctx.user,
				locale: ctx.locale,
			});
		}
	},
});
