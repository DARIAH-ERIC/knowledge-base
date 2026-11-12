"use server";

import { moveDocumentPolicy } from "@/lib/data/documents-policies-order";
import { getDocumentIdForVersion } from "@/lib/data/entity-lifecycle";
import { createCommandAction } from "@/lib/server/create-command-action";
import { UserFacingError } from "@/lib/user-facing-error";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const moveDocumentOrPolicyAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "update", subjectType: "documents_policies" },
	revalidate: "/[locale]/dashboard/website/documents-policies",

	/** `id` is the version the dashboard lists, i.e. the entry's latest editable one. */
	async mutate(tx, [id, direction]: [string, "up" | "down"]) {
		const item = await tx.query.documentsPolicies.findFirst({
			where: { id },
			columns: { groupId: true },
		});

		if (item == null) {
			throw new UserFacingError("record-not-found");
		}

		const entityId = await getDocumentIdForVersion(tx, id);

		await moveDocumentPolicy(tx, entityId, item.groupId, direction);

		return { subjectId: id, auditSummary: { direction } };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["documents-policies"] });
	},
});
