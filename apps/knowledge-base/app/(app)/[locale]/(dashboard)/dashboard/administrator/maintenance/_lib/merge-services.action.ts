"use server";

import type { MergeSummary } from "@/lib/data/merge-summary";
import { mergeServices } from "@/lib/data/service-merge";
import { createCommandAction } from "@/lib/server/create-command-action";

interface MergeServicesActionResult {
	subjectId: string;
	subjectLabel: string;
	auditSummary: Record<string, unknown>;
	/** What the merge re-pointed, listed in the UI once it succeeds. */
	successData: { summary: MergeSummary };
}

export const mergeServicesAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "delete", subjectType: "internal_services" },
	revalidate: [
		"/[locale]/dashboard/administrator/maintenance",
		"/[locale]/dashboard/administrator/internal-services",
		"/[locale]/dashboard/administrator/sshoc-services",
	],

	async mutate(tx, [sourceId, targetId]: [string, string]): Promise<MergeServicesActionResult> {
		const result = await mergeServices(tx, sourceId, targetId);

		return {
			subjectId: sourceId,
			// Resolved by the merge before the row is deleted — the audit log cannot look it up after.
			subjectLabel: result.source.name,
			auditSummary: {
				mergedInto: { id: result.target.id, name: result.target.name },
				source: {
					name: result.source.name,
					type: result.source.type,
					status: result.source.status,
					sshocMarketplaceId: result.source.sshocMarketplaceId,
				},
				repointed: result.summary,
			},
			successData: { summary: result.summary },
		};
	},
});
