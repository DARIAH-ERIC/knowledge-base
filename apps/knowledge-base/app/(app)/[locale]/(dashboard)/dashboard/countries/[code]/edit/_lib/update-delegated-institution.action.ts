"use server";

import { getExtracted } from "next-intl/server";
import * as v from "valibot";

import { UpdateInstitutionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/update-institution.schema";
import { assertCanEditCountryInstitution } from "@/app/(app)/[locale]/(dashboard)/dashboard/countries/[code]/edit/_lib/authorize-country-institution-relation";
import { updateDraftDocumentSlug } from "@/lib/data/entity-lifecycle";
import { checkSshocMarketplaceActorIdAvailable } from "@/lib/data/sshoc-marketplace-actor-id";
import { updateManagedOrganisationalUnitDraft } from "@/lib/data/update-managed-organisational-unit";
import { getRequestedSlug } from "@/lib/entity-slug-input";
import { createMutationAction } from "@/lib/server/create-mutation-action";

// Related entities and resources are curated by admins, so the delegated form does not offer them;
// the draft is resolved from `documentId`, so no version id is posted either.
const UpdateDelegatedInstitutionActionInputSchema = v.omit(UpdateInstitutionActionInputSchema, [
	"id",
	"relatedEntityIds",
	"relatedResourceIds",
]);

/**
 * Edits an institution as a draft, with the fields of the admin edit form except relations. The
 * caller may edit an institution located in a country they manage; publishing remains an admin
 * task.
 */
export const updateDelegatedInstitutionAction = createMutationAction({
	schema: UpdateDelegatedInstitutionActionInputSchema,
	requireAuth: true,
	audit: { action: "update", subjectType: "institutions" },
	revalidate: "/[locale]/dashboard/countries",
	async preCheck({ input, ctx }) {
		await assertCanEditCountryInstitution(ctx.user, input.documentId);
		return checkSshocMarketplaceActorIdAvailable({
			sshocMarketplaceActorId: input.sshocMarketplaceActorId,
			excludeDocumentId: input.documentId,
		});
	},
	async mutate(tx, input) {
		const t = await getExtracted();

		await updateManagedOrganisationalUnitDraft(tx, input);

		// The form only offers the slug while the document is draft-only; `updateDraftDocumentSlug`
		// re-checks that server-side, so a forged submission cannot rename a published page.
		const requestedSlug = getRequestedSlug(input.slug);
		if (requestedSlug != null) {
			await updateDraftDocumentSlug(tx, input.documentId, requestedSlug);
		}

		return {
			subjectId: input.documentId,
			auditSummary: { lifecycle: "draft" },
			successMessage: t("Institution saved as draft."),
			successData: { name: input.name },
		};
	},
});
