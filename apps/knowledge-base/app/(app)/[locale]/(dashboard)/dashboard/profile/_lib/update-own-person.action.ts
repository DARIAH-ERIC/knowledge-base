"use server";

import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";
import * as v from "valibot";

import { UpdatePersonActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/update-person.schema";
import { updatePersonDraft } from "@/lib/data/save-person-draft";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const UpdateOwnPersonActionInputSchema = v.object({
	...v.omit(UpdatePersonActionInputSchema, ["documentId", "slug"]).entries,
	name: v.pipe(v.string(), v.nonEmpty()),
	sortName: v.pipe(v.string(), v.nonEmpty()),
});

/**
 * Lets a user edit the person their account is linked to, as a draft that an admin publishes. The
 * person comes from the session, never from the form, and the slug is kept: people may not choose
 * their own public URL. Relations (and so roles and permissions) are not editable here.
 */
export const updateOwnPersonAction = createMutationAction({
	schema: UpdateOwnPersonActionInputSchema,
	requireAuth: true,
	audit: { action: "update", subjectType: "persons" },
	revalidate: "/[locale]/dashboard/profile",
	async preCheck({ ctx }) {
		if (ctx.user.personDocumentId == null) {
			const t = await getExtracted();
			return createActionStateError({
				message: t("Your account is not linked to a person."),
			});
		}
		return undefined;
	},
	async mutate(tx, input, ctx) {
		const t = await getExtracted();
		const documentId = ctx.user.personDocumentId;
		if (documentId == null) {
			throw new Error("Expected the account to be linked to a person.");
		}
		await updatePersonDraft(tx, documentId, { ...input, requestedSlug: null });
		return {
			subjectId: documentId,
			auditSummary: { lifecycle: "draft" },
			successMessage: t("Your changes were saved and will be published after review."),
		};
	},
});
