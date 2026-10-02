"use server";

import { documentsPoliciesLifecycleAdapter } from "@/lib/data/documents-policies.lifecycle-adapter";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { createCommandAction } from "@/lib/server/create-command-action";

export const discardDocumentOrPolicyDraftAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "discard_draft", subjectType: "documents_policies" },
	revalidate: "/[locale]/dashboard/website/documents-policies",
	redirect: "/dashboard/website/documents-policies",

	async mutate(tx, [documentId]: [string]) {
		await discardDraftVersion(tx, documentId, documentsPoliciesLifecycleAdapter);
		return { subjectId: documentId };
	},
});
