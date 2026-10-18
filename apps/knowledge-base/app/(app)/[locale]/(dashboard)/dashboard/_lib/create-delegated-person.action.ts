"use server";

import { getExtracted } from "next-intl/server";
import * as v from "valibot";

import { CreatePersonActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/create-person.schema";
import { assertCan } from "@/lib/auth/permissions";
import { createPersonDraft } from "@/lib/data/save-person-draft";
import { getRequestedSlug } from "@/lib/entity-slug-input";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const CreateDelegatedPersonActionInputSchema = v.object({
	...CreatePersonActionInputSchema.entries,
	organisationalUnitDocumentId: v.pipe(v.string(), v.uuid()),
});

/**
 * Creates a new person as a draft, so a delegated caller (working-group chair, national
 * coordinator) can add someone who is not yet in the system and immediately relate them to the unit
 * they manage. Takes the same fields as the admin create form; publishing the person remains an
 * admin task. Authorized against the organisational unit the caller is editing.
 */
export const createDelegatedPersonAction = createMutationAction({
	schema: CreateDelegatedPersonActionInputSchema,
	requireAuth: true,
	audit: { action: "create", subjectType: "persons" },
	revalidate: "/[locale]/dashboard",
	async preCheck({ input, ctx }) {
		await assertCan(ctx.user, "update", {
			type: "organisational_unit",
			id: input.organisationalUnitDocumentId,
		});
	},
	async mutate(tx, input) {
		const t = await getExtracted();
		const { documentId } = await createPersonDraft(tx, {
			...input,
			requestedSlug: getRequestedSlug(input.slug),
		});
		return {
			subjectId: documentId,
			auditSummary: { lifecycle: "draft" },
			successMessage: t("Person saved as draft."),
			successData: { id: documentId, name: input.name, sortName: input.sortName },
		};
	},
});
