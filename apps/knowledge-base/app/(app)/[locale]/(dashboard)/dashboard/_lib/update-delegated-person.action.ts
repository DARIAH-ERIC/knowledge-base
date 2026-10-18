"use server";

import { getExtracted } from "next-intl/server";
import * as v from "valibot";

import { assertCanEditPerson } from "@/app/(app)/[locale]/(dashboard)/dashboard/_lib/authorize-delegated-person";
import { UpdatePersonActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/update-person.schema";
import { updatePersonDraft } from "@/lib/data/save-person-draft";
import { getRequestedSlug } from "@/lib/entity-slug-input";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const UpdateDelegatedPersonActionInputSchema = v.object({
	...UpdatePersonActionInputSchema.entries,
	// Required here, as the people table shows the saved name right away.
	name: v.pipe(v.string(), v.nonEmpty()),
	sortName: v.pipe(v.string(), v.nonEmpty()),
});

/**
 * Edits a person as a draft, with the same fields as the admin edit form. A delegated caller
 * (working-group chair, national coordinator) may edit a person who appears in a unit they manage;
 * publishing remains an admin task.
 */
export const updateDelegatedPersonAction = createMutationAction({
	schema: UpdateDelegatedPersonActionInputSchema,
	requireAuth: true,
	audit: { action: "update", subjectType: "persons" },
	revalidate: "/[locale]/dashboard",
	async preCheck({ input, ctx }) {
		await assertCanEditPerson(ctx.user, input.documentId);
	},
	async mutate(tx, input) {
		const t = await getExtracted();
		await updatePersonDraft(tx, input.documentId, {
			...input,
			requestedSlug: getRequestedSlug(input.slug),
		});
		return {
			subjectId: input.documentId,
			auditSummary: { lifecycle: "draft" },
			successMessage: t("Person saved as draft."),
			successData: { name: input.name, sortName: input.sortName },
		};
	},
});
