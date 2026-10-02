"use server";

import * as schema from "@dariah-eric/database/schema";

import { and, eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const deleteSpotlightArticleContributorAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "delete", subjectType: "spotlight_articles" },
	revalidate: "/[locale]/dashboard/website/spotlight-articles",

	async mutate(tx, [articleId, personId]: [string, string]) {
		// articleId and personId are document ids (entities.id); contributors are document-level.
		await tx
			.delete(schema.spotlightArticlesToPersons)
			.where(
				and(
					eq(schema.spotlightArticlesToPersons.spotlightArticleDocumentId, articleId),
					eq(schema.spotlightArticlesToPersons.personDocumentId, personId),
				),
			);

		return { subjectId: articleId, auditSummary: { personId } };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["spotlight-articles"] });
	},
});
