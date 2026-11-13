"use server";

import { getExtracted } from "next-intl/server";
import * as v from "valibot";

import { UpdateInstitutionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/update-institution.schema";
import { assertCanEditCountryInstitution } from "@/app/(app)/[locale]/(dashboard)/dashboard/countries/[code]/edit/_lib/authorize-country-institution-relation";
import { checkSshocMarketplaceActorIdAvailable } from "@/lib/data/sshoc-marketplace-actor-id";
import { updateManagedOrganisationalUnitDraft } from "@/lib/data/update-managed-organisational-unit";
import {
	isDelegatedChange,
	notifyChangesAwaitingReview,
	startsPendingChanges,
} from "@/lib/email/send-delegated-change-notification";
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
	postCommit({ result, ctx }) {
		if (result.postCommitData?.startsReview !== true) {
			return;
		}
		return notifyChangesAwaitingReview({
			kind: "institution",
			documentId: result.subjectId,
			user: ctx.user,
			realUser: ctx.realUser,
			locale: ctx.locale,
		});
	},
	async mutate(tx, input, ctx) {
		const t = await getExtracted();

		// Notified once per round of changes: only the save that starts them.
		const startsReview =
			isDelegatedChange(ctx.user, ctx.realUser) &&
			(await startsPendingChanges(tx, input.documentId));

		// The slug is not saved here: choosing the public URL is an administrator task, so a slug
		// submitted from the delegated form is ignored.
		await updateManagedOrganisationalUnitDraft(tx, input);

		return {
			subjectId: input.documentId,
			postCommitData: { startsReview },
			auditSummary: { lifecycle: "draft" },
			successMessage: t("Institution saved as draft."),
			successData: { name: input.name },
		};
	},
});
