"use server";

import { documentsPoliciesLifecycleAdapter } from "@/lib/data/documents-policies.lifecycle-adapter";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createCommandAction } from "@/lib/server/create-command-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const publishDocumentOrPolicyAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "publish", subjectType: "documents_policies" },
	revalidate: "/[locale]/dashboard/website/documents-policies",
	redirect: "/dashboard/website/documents-policies",

	async mutate(tx, [documentId]: [string]) {
		await publishVersion(tx, documentId, documentsPoliciesLifecycleAdapter);
		return { subjectId: documentId };
	},

	async postCommit({ result }) {
		await syncWebsiteDocumentForEntity(result.subjectId);
		await dispatchWebhook({ tags: ["documents-policies"] });
	},
});
