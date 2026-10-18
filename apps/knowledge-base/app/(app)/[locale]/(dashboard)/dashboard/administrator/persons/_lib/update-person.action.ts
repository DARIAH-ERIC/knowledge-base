"use server";

import { UpdatePersonActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/update-person.schema";
import { getDocumentSlug, publishVersion } from "@/lib/data/entity-lifecycle";
import { personsLifecycleAdapter } from "@/lib/data/persons.lifecycle-adapter";
import { updatePersonDraft } from "@/lib/data/save-person-draft";
import { getRequestedSlug } from "@/lib/entity-slug-input";
import { shouldSaveAndPublish } from "@/lib/form-intent";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createMutationAction, getResultSlug } from "@/lib/server/create-mutation-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const updatePersonAction = createMutationAction({
	schema: UpdatePersonActionInputSchema,
	requireAdmin: true,
	audit: { action: "update", subjectType: "persons" },
	revalidate: "/[locale]/dashboard/administrator/persons",
	redirect: ({ result }) => `/dashboard/administrator/persons/${getResultSlug(result)}/details`,

	async mutate(tx, input, { formData }) {
		await updatePersonDraft(tx, input.documentId, {
			...input,
			requestedSlug: getRequestedSlug(input.slug),
		});

		if (shouldSaveAndPublish(formData)) {
			await publishVersion(tx, input.documentId, personsLifecycleAdapter);
		}

		return {
			subjectId: input.documentId,
			subjectSlug: await getDocumentSlug(tx, input.documentId),
			auditSummary: {
				lifecycle: shouldSaveAndPublish(formData) ? "published" : "draft",
			},
		};
	},

	async postCommit({ result, ctx }) {
		if (!shouldSaveAndPublish(ctx.formData)) {
			return;
		}
		await syncWebsiteDocumentForEntity(result.subjectId);
		await dispatchWebhook({ tags: ["persons"] });
	},
});
