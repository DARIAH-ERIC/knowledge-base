"use server";

import { assert } from "@acdh-oeaw/lib";

import { canManageAdminAccounts } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/users/_lib/admin-management";
import { sendUserInvitation } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/users/_lib/send-user-invitation";
import { createCommandAction } from "@/lib/server/create-command-action";
import { UserFacingError } from "@/lib/user-facing-error";

/**
 * Sends a new invitation link to a user who has not accepted theirs yet; the old link stops
 * working.
 */
export const resendUserInvitationAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "update", subjectType: "users" },
	revalidate: "/[locale]/dashboard/administrator/users",

	async mutate(tx, [id]: [string], ctx) {
		const currentUser = ctx.user;
		assert(currentUser, "Not authenticated.");

		const user = await tx.query.users.findFirst({
			where: { id },
			columns: { id: true, email: true, name: true, role: true, passwordHash: true },
		});
		if (user == null) {
			throw new UserFacingError("record-not-found");
		}

		if (user.role === "admin" && !canManageAdminAccounts(currentUser)) {
			throw new UserFacingError("admin-account-change-not-allowed");
		}

		if (user.passwordHash != null) {
			throw new UserFacingError("invitation-not-pending");
		}

		await sendUserInvitation(tx, user, ctx.locale);

		return {
			subjectId: id,
			subjectLabel: `${user.name} (${user.email})`,
			auditSummary: { invitation: "resent" },
		};
	},
});
