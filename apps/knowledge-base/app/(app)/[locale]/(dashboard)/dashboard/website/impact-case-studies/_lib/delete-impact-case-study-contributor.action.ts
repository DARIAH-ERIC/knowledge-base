"use server";

import * as schema from "@dariah-eric/database/schema";

import { and, eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const deleteImpactCaseStudyContributorAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "delete", subjectType: "impact_case_studies" },
	revalidate: "/[locale]/dashboard/website/impact-case-studies",

	async mutate(tx, [articleId, personId]: [string, string]) {
		// articleId and personId are document ids (entities.id); contributors are document-level.
		await tx
			.delete(schema.impactCaseStudiesToPersons)
			.where(
				and(
					eq(schema.impactCaseStudiesToPersons.impactCaseStudyDocumentId, articleId),
					eq(schema.impactCaseStudiesToPersons.personDocumentId, personId),
				),
			);

		return { subjectId: articleId, auditSummary: { personId } };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["impact-case-studies"] });
	},
});
