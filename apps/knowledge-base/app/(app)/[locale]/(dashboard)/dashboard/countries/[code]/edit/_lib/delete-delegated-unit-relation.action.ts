"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import { assertCanManageCountryInstitutionRelation } from "@/app/(app)/[locale]/(dashboard)/dashboard/countries/[code]/edit/_lib/authorize-country-institution-relation";
import { resolveAuditSubjectLabel } from "@/lib/data/audit-log";
import { eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { UserFacingError } from "@/lib/user-facing-error";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

/** Delegated counterpart of `deleteUnitRelationAction` for country partner-institution relations. */
export const deleteDelegatedUnitRelationAction = createCommandAction({
	requireAuth: true,
	audit: { action: "delete", subjectType: "unit_relations" },
	revalidate: "/[locale]/dashboard/countries",

	async mutate(tx, [id]: [string], ctx) {
		assert(ctx.user, "Not authenticated.");

		const relation = await tx.query.organisationalUnitsRelations.findFirst({
			where: { id },
			columns: { unitDocumentId: true, relatedUnitDocumentId: true },
		});
		if (relation == null) {
			throw new UserFacingError("record-not-found");
		}

		await assertCanManageCountryInstitutionRelation(ctx.user, {
			institutionDocumentId: relation.unitDocumentId,
			relatedUnitDocumentId: relation.relatedUnitDocumentId,
		});

		// Snapshot the label while the row still exists, so the audit log doesn't fall back to the uuid.
		const subjectLabel = await resolveAuditSubjectLabel("unit_relations", id, tx);

		await tx
			.delete(schema.organisationalUnitsRelations)
			.where(eq(schema.organisationalUnitsRelations.id, id));

		return { subjectId: id, subjectLabel };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["members-partners", "working-groups"] });
	},
});
