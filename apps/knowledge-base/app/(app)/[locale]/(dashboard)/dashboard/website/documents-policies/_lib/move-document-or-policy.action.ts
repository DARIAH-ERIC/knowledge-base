"use server";

import * as schema from "@dariah-eric/database/schema";

import { and, eq, isNull } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { UserFacingError } from "@/lib/user-facing-error";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const moveDocumentOrPolicyAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "update", subjectType: "documents_policies" },
	revalidate: "/[locale]/dashboard/website/documents-policies",

	async mutate(tx, [id, direction]: [string, "up" | "down"]) {
		const item = await tx.query.documentsPolicies.findFirst({
			where: { id },
			columns: { id: true, position: true, groupId: true },
		});

		if (item == null) {
			throw new UserFacingError("record-not-found");
		}

		const siblings = await tx
			.select({ id: schema.documentsPolicies.id, position: schema.documentsPolicies.position })
			.from(schema.documentsPolicies)
			.where(
				item.groupId != null
					? eq(schema.documentsPolicies.groupId, item.groupId)
					: and(isNull(schema.documentsPolicies.groupId)),
			)
			.orderBy(schema.documentsPolicies.position);

		const currentIndex = siblings.findIndex((s) => s.id === id);
		const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

		if (targetIndex < 0 || targetIndex >= siblings.length) {
			return { subjectId: id, auditSummary: { direction } };
		}

		const target = siblings[targetIndex];
		if (target == null) {
			return { subjectId: id, auditSummary: { direction } };
		}

		await tx
			.update(schema.documentsPolicies)
			.set({ position: target.position })
			.where(eq(schema.documentsPolicies.id, id));

		await tx
			.update(schema.documentsPolicies)
			.set({ position: item.position })
			.where(eq(schema.documentsPolicies.id, target.id));

		return { subjectId: id, auditSummary: { direction } };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["documents-policies"] });
	},
});
