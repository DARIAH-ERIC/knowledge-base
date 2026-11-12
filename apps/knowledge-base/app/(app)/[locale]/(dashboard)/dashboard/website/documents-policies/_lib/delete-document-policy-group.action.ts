"use server";

import * as schema from "@dariah-eric/database/schema";

import {
	getDocumentPolicyOrder,
	setDocumentPolicyOrder,
} from "@/lib/data/documents-policies-order";
import { eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const deleteDocumentPolicyGroupAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "delete", subjectType: "documents_policies" },
	revalidate: "/[locale]/dashboard/website/documents-policies",

	async mutate(tx, [id]: [string]) {
		// The subject is a document-policy *group* (not an entity document), so snapshot its label from
		// the group table before deletion — the generic entity resolver can't recover it afterwards.
		const group = await tx.query.documentPolicyGroups.findFirst({
			where: { id },
			columns: { label: true },
		});

		await tx
			.update(schema.documentsPolicies)
			.set({ groupId: null })
			.where(eq(schema.documentsPolicies.groupId, id));

		await setDocumentPolicyOrder(tx, null, await getDocumentPolicyOrder(tx, null));

		await tx.delete(schema.documentPolicyGroups).where(eq(schema.documentPolicyGroups.id, id));

		return { subjectId: id, subjectLabel: group?.label ?? null };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["documents-policies"] });
	},
});
