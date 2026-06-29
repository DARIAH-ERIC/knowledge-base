"use server";

import { publishVersion } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createCommandAction } from "@/lib/server/create-command-action";
import { dispatchWebhook, organisationalUnitChangeEvent } from "@/lib/webhook/dispatch-webhook";

export const publishWorkingGroupAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "publish", subjectType: "working_groups" },
	revalidate: "/[locale]/dashboard/administrator/working-groups",
	redirect: "/dashboard/administrator/working-groups",

	async mutate(tx, [documentId]: [string]) {
		await publishVersion(tx, documentId, organisationalUnitsLifecycleAdapter);
		return { subjectId: documentId };
	},

	async postCommit({ result }) {
		await syncWebsiteDocumentForEntity(result.subjectId);
		await dispatchWebhook({ events: [organisationalUnitChangeEvent("working_group")] });
	},
});
