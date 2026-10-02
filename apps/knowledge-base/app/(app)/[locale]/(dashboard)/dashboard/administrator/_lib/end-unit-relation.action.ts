"use server";

import * as schema from "@dariah-eric/database/schema";

import { eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { UserFacingError } from "@/lib/user-facing-error";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const endUnitRelationAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "relation_end", subjectType: "unit_relations" },
	revalidate: "/[locale]/dashboard/administrator",

	async mutate(tx, [id, end]: [string, Date]) {
		const relation = await tx.query.organisationalUnitsRelations.findFirst({
			where: { id },
			columns: { duration: true },
		});
		if (relation == null) {
			throw new UserFacingError("record-not-found");
		}

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
