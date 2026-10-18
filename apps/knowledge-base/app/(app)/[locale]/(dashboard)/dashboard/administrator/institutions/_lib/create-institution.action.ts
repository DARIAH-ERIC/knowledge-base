"use server";

import { CreateInstitutionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/create-institution.schema";
import { createInstitutionDraft } from "@/lib/data/create-institution-draft";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { checkSshocMarketplaceActorIdAvailable } from "@/lib/data/sshoc-marketplace-actor-id";
import { getRequestedSlug } from "@/lib/entity-slug-input";
import { shouldSaveAndPublish } from "@/lib/form-intent";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createMutationAction, getCreatedSlug } from "@/lib/server/create-mutation-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createInstitutionAction = createMutationAction({
	schema: CreateInstitutionActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "institutions" },
	revalidate: "/[locale]/dashboard/administrator/institutions",
	redirect: ({ result }) =>
		`/dashboard/administrator/institutions/${getCreatedSlug(result)}/details`,

	async preCheck({ input }) {
		return checkSshocMarketplaceActorIdAvailable({
			sshocMarketplaceActorId: input.sshocMarketplaceActorId,
		});
	},

	async mutate(tx, input, { formData }) {
		const { documentId, slug } = await createInstitutionDraft(tx, {
			...input,
			requestedSlug: getRequestedSlug(input.slug),
		});

		if (shouldSaveAndPublish(formData)) {
			await publishVersion(tx, documentId, organisationalUnitsLifecycleAdapter);
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
		await dispatchWebhook({ tags: ["members-partners"] });
	},
});
