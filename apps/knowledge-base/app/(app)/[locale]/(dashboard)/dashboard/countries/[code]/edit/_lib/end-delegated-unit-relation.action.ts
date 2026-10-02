"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import { assertCanManageCountryInstitutionRelation } from "@/app/(app)/[locale]/(dashboard)/dashboard/countries/[code]/edit/_lib/authorize-country-institution-relation";
import { eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { UserFacingError } from "@/lib/user-facing-error";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

/** Delegated counterpart of `endUnitRelationAction` for country partner-institution relations. */
export const endDelegatedUnitRelationAction = createCommandAction({
	requireAuth: true,
	audit: { action: "relation_end", subjectType: "unit_relations" },
	revalidate: "/[locale]/dashboard/countries",

	async mutate(tx, [id, end]: [string, Date], ctx) {
		assert(ctx.user, "Not authenticated.");

		const relation = await tx.query.organisationalUnitsRelations.findFirst({
			where: { id },
			columns: { duration: true, unitDocumentId: true, relatedUnitDocumentId: true },
		});
		if (relation == null) {
			throw new UserFacingError("record-not-found");
		}

		await assertCanManageCountryInstitutionRelation(ctx.user, {
			institutionDocumentId: relation.unitDocumentId,
			relatedUnitDocumentId: relation.relatedUnitDocumentId,
		});

		if (end < relation.duration.start) {
			throw new UserFacingError("relation-end-before-start");
		}

		await tx
			.update(schema.organisationalUnitsRelations)
			.set({ duration: { start: relation.duration.start, end } })
			.where(eq(schema.organisationalUnitsRelations.id, id));

		return { subjectId: id, auditSummary: { end } };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["members-partners", "working-groups"] });
	},
});
