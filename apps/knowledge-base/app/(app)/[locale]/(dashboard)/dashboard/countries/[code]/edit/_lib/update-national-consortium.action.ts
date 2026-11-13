"use server";

/** Delegated country-dashboard update; publishing remains admin-only. */

import { getExtracted } from "next-intl/server";

import { UpdateNationalConsortiumActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_lib/update-national-consortium.schema";
import { assertCan } from "@/lib/auth/permissions";
import { updateManagedOrganisationalUnitDraft } from "@/lib/data/update-managed-organisational-unit";
import {
	isDelegatedChange,
	notifyChangesAwaitingReview,
	startsPendingChanges,
} from "@/lib/email/send-delegated-change-notification";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const updateDelegatedNationalConsortiumAction = createMutationAction({
	schema: UpdateNationalConsortiumActionInputSchema,
	requireAuth: true,
	audit: { action: "update", subjectType: "national_consortia" },
	revalidate: "/[locale]/dashboard/countries",
	async preCheck({ input, ctx }) {
		await assertCan(ctx.user, "update", { type: "organisational_unit", id: input.documentId });
	},
	postCommit({ result, ctx }) {
		if (result.postCommitData?.startsReview !== true) {
			return;
		}
		return notifyChangesAwaitingReview({
			kind: "national consortium",
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

		await updateManagedOrganisationalUnitDraft(tx, input);
		return {
			subjectId: input.documentId,
			postCommitData: { startsReview },
			auditSummary: { lifecycle: "draft" },
			successMessage: t("National consortium saved as draft."),
		};
	},
});
