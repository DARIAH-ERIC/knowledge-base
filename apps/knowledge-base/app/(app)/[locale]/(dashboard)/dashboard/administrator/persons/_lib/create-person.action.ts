"use server";

import { CreatePersonActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/create-person.schema";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { personsLifecycleAdapter } from "@/lib/data/persons.lifecycle-adapter";
import { createPersonDraft } from "@/lib/data/save-person-draft";
import { getRequestedSlug } from "@/lib/entity-slug-input";
import { shouldSaveAndPublish } from "@/lib/form-intent";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createMutationAction, getCreatedSlug } from "@/lib/server/create-mutation-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createPersonAction = createMutationAction({
	schema: CreatePersonActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "persons" },
	revalidate: "/[locale]/dashboard/administrator/persons",
	redirect: ({ result }) => `/dashboard/administrator/persons/${getCreatedSlug(result)}/details`,

	async mutate(tx, input, { formData }) {
		const { documentId, slug } = await createPersonDraft(tx, {
			...input,
			requestedSlug: getRequestedSlug(input.slug),
		});

		if (shouldSaveAndPublish(formData)) {
			await publishVersion(tx, documentId, personsLifecycleAdapter);
		}

		return {
			subjectId: documentId,
			subjectSlug: slug,
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
