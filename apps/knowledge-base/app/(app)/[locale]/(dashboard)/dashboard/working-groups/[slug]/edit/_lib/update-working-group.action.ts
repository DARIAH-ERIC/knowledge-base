"use server";

import { getExtracted } from "next-intl/server";

import { UpdateWorkingGroupActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/update-working-group.schema";
import { assertCan } from "@/lib/auth/permissions";
import { updateManagedOrganisationalUnitDraft } from "@/lib/data/update-managed-organisational-unit";
import {
	isDelegatedChange,
	notifyChangesAwaitingReview,
	startsPendingChanges,
} from "@/lib/email/send-delegated-change-notification";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const updateDelegatedWorkingGroupAction = createMutationAction({
	schema: UpdateWorkingGroupActionInputSchema,
	requireAuth: true,
	audit: { action: "update", subjectType: "working_groups" },
	revalidate: "/[locale]/dashboard/working-groups",
	async preCheck({ input, ctx }) {
		await assertCan(ctx.user, "update", { type: "organisational_unit", id: input.documentId });
	},
	postCommit({ result, ctx }) {
		if (result.postCommitData?.startsReview !== true) {
			return;
		}
		return notifyChangesAwaitingReview({
			kind: "working group",
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
			successMessage: t("Working group saved as draft."),
		};
	},
});
