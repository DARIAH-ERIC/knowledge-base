"use server";

import type { MergeSummary } from "@/lib/data/merge-summary";
import { mergeSocialMedia } from "@/lib/data/social-media-merge";
import { isSocialMediaLinkedToPublishedEric } from "@/lib/data/social-media-relations";
import { createCommandAction } from "@/lib/server/create-command-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

interface MergeSocialMediaActionResult {
	subjectId: string;
	subjectLabel: string;
	auditSummary: Record<string, unknown>;
	/** What the merge re-pointed, listed in the UI once it succeeds. */
	successData: { summary: MergeSummary };
	affectsSiteMetadata: boolean;
}

export const mergeSocialMediaAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "delete", subjectType: "social_media" },
	revalidate: "/[locale]/dashboard/administrator/maintenance",

	async mutate(tx, [sourceId, targetId]: [string, string]): Promise<MergeSocialMediaActionResult> {
		const affectsSiteMetadata = await isSocialMediaLinkedToPublishedEric(tx, [sourceId]);
		const result = await mergeSocialMedia(tx, sourceId, targetId);

		return {
			subjectId: sourceId,
			// Resolved by the merge before the row is deleted — the audit log cannot look it up after.
			subjectLabel: result.source.name,
			auditSummary: {
				mergedInto: { id: result.target.id, name: result.target.name, url: result.target.url },
				source: { type: result.source.type, name: result.source.name, url: result.source.url },
				repointed: result.summary,
			},
			successData: { summary: result.summary },
			affectsSiteMetadata,
		};
	},

	async postCommit({ result }) {
		// Units and projects that linked the source now link the target.
		await dispatchWebhook({
			tags: ["social-media", ...(result.affectsSiteMetadata ? (["site-metadata"] as const) : [])],
		});
	},
});
