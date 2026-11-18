"use server";

import { resolveDocumentOrPolicyTarget } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/resolve-document-or-policy-target";
import { UpdateDocumentOrPolicyDetailsActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/update-document-or-policy-details.schema";
import { updateDocumentPolicyDetails } from "@/lib/data/documents-policies-details";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createMutationAction } from "@/lib/server/create-mutation-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const updateDocumentOrPolicyDetailsAction = createMutationAction<
	typeof UpdateDocumentOrPolicyDetailsActionInputSchema,
	{ entityDocumentId: string; isPublishedChange: boolean }
>({
	schema: UpdateDocumentOrPolicyDetailsActionInputSchema,
	requireAdmin: true,
	audit: { action: "update", subjectType: "documents_policies" },
	revalidate: "/[locale]/dashboard/website/documents-policies",

	async mutate(tx, input) {
		const target = await resolveDocumentOrPolicyTarget(tx, input);

		const { documentId, isPublishedChange } = await updateDocumentPolicyDetails(tx, {
			versionId: input.id,
			values: {
				title: input.title,
				summary: input.summary,
				groupId: input.groupId ?? null,
				...target,
			},
		});

		return {
			subjectId: input.id,
			successData: { entityDocumentId: documentId, isPublishedChange },
		};
	},

	async postCommit({ result }) {
		if (result.successData == null || !result.successData.isPublishedChange) {
			return;
		}

		await syncWebsiteDocumentForEntity(result.successData.entityDocumentId);
		await dispatchWebhook({ tags: ["documents-policies"] });
	},
});
