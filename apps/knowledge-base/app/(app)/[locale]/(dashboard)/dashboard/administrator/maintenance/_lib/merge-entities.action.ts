"use server";

import { resolveEntityDocumentLabel } from "@/lib/data/audit-log";
import { mergeEntities } from "@/lib/data/entity-merge";
import {
	type WebsiteDocumentDescriptor,
	deleteWebsiteDocument,
	getWebsiteDocumentDescriptorByEntityId,
	syncWebsiteDocumentForEntity,
} from "@/lib/search/website-index";
import { createCommandAction } from "@/lib/server/create-command-action";
import { dispatchWebhookForEntityType } from "@/lib/webhook/dispatch-webhook";

interface MergeEntitiesActionResult {
	subjectId: string;
	subjectLabel: string | null;
	targetId: string;
	entityType: string;
	/** The soon-to-be-deleted source's website document — removed after the merge commits. */
	sourceDescriptor: WebsiteDocumentDescriptor | null;
	auditSummary: Record<string, unknown>;
}

export const mergeEntitiesAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "delete", subjectType: "entities" },
	revalidate: "/[locale]/dashboard/administrator/maintenance",

	async mutate(tx, [sourceId, targetId]: [string, string]): Promise<MergeEntitiesActionResult> {
		// Capture the source's website document before it is deleted (read outside the tx).
		const sourceDescriptor = await getWebsiteDocumentDescriptorByEntityId(sourceId);

		// Snapshot the source's label before the merge deletes it: the audit subject is the entity
		// that goes away, so the wrapper's own (post-mutate) resolution would find nothing left and
		// the row would render as "entities #<uuid>".
		const subjectLabel = await resolveEntityDocumentLabel(tx, sourceId);

		const result = await mergeEntities(tx, sourceId, targetId);

		return {
			subjectId: sourceId,
			subjectLabel,
			targetId: result.targetId,
			entityType: result.type,
			sourceDescriptor,
			auditSummary: { sourceId, targetId: result.targetId, type: result.type },
		};
	},

	async postCommit({ result }) {
		if (result.sourceDescriptor != null) {
			await deleteWebsiteDocument(result.sourceDescriptor);
		}
		await syncWebsiteDocumentForEntity(result.targetId);
		await dispatchWebhookForEntityType(
			result.entityType as Parameters<typeof dispatchWebhookForEntityType>[0],
		);
	},
});
