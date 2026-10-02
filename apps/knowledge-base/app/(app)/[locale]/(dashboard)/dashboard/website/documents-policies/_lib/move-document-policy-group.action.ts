"use server";

import * as schema from "@dariah-eric/database/schema";

import { eq, sql } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { UserFacingError } from "@/lib/user-facing-error";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const moveDocumentPolicyGroupAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "update", subjectType: "documents_policies" },
	revalidate: "/[locale]/dashboard/website/documents-policies",

	async mutate(tx, [id, direction]: [string, "up" | "down"]) {
		await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('document_policy_groups_order'))`);
		const siblings = await tx
			.select({
				id: schema.documentPolicyGroups.id,
				position: schema.documentPolicyGroups.position,
			})
			.from(schema.documentPolicyGroups)
			.orderBy(schema.documentPolicyGroups.position, schema.documentPolicyGroups.label);

		const currentIndex = siblings.findIndex((sibling) => sibling.id === id);
		if (currentIndex < 0) {
			throw new UserFacingError("record-not-found");
		}
		const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

		if (targetIndex < 0 || targetIndex >= siblings.length) {
			return { subjectId: id, auditSummary: { direction } };
		}

		const [group] = siblings.splice(currentIndex, 1);
		if (group == null) {
			return { subjectId: id, auditSummary: { direction } };
		}
		siblings.splice(targetIndex, 0, group);

		// Rewrite the ordered set rather than swapping raw values: equal legacy positions would make a
		// swap a successful no-op. This also closes any gaps left by deleted groups.
		for (const [position, sibling] of siblings.entries()) {
			if (sibling.position !== position) {
				await tx
					.update(schema.documentPolicyGroups)
					.set({ position })
					.where(eq(schema.documentPolicyGroups.id, sibling.id));
			}
		}

		return { subjectId: id, auditSummary: { direction } };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["documents-policies"] });
	},
});
