"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import { assertCan } from "@/lib/auth/permissions";
import { eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { UserFacingError } from "@/lib/user-facing-error";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const endContributionAction = createCommandAction({
	requireAuth: true,
	audit: { action: "relation_end", subjectType: "contributions" },
	revalidate: "/[locale]/dashboard/administrator",

	async mutate(tx, [id, end]: [string, Date], ctx) {
		assert(ctx.user, "Not authenticated.");

		const contribution = await tx.query.personsToOrganisationalUnits.findFirst({
			where: { id },
			columns: { duration: true, organisationalUnitDocumentId: true },
		});
		if (contribution == null) {
			throw new UserFacingError("record-not-found");
		}

		// Admins always pass; delegated callers may only manage people on units they are scoped to edit.
		await assertCan(ctx.user, "update", {
			type: "organisational_unit",
			id: contribution.organisationalUnitDocumentId,
		});

		if (end < contribution.duration.start) {
			throw new UserFacingError("relation-end-before-start");
		}

		await tx
			.update(schema.personsToOrganisationalUnits)
			.set({ duration: { start: contribution.duration.start, end } })
			.where(eq(schema.personsToOrganisationalUnits.id, id));

		return { subjectId: id, auditSummary: { end } };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["persons"] });
	},
});
