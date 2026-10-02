"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import {
	canManageAdminAccounts,
	countAdminManagers,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/users/_lib/admin-management";
import { eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { UserFacingError } from "@/lib/user-facing-error";

export const deleteUserAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "delete", subjectType: "users" },
	revalidate: "/[locale]/dashboard/administrator/users",

	async mutate(tx, [id]: [string], ctx) {
		const currentUser = ctx.user;
		assert(currentUser, "Not authenticated.");

		if (currentUser.id === id) {
			throw new UserFacingError("own-account-deletion");
		}

		const user = await tx.query.users.findFirst({
			where: { id },
			columns: { role: true, canManageAdmins: true, name: true, email: true },
		});
		if (user == null) {
			throw new UserFacingError("record-not-found");
		}

		if (user.role === "admin" && !canManageAdminAccounts(currentUser)) {
			throw new UserFacingError("admin-account-deletion-not-allowed");
		}

		if (user.role === "admin" && user.canManageAdmins && (await countAdminManagers()) <= 1) {
			throw new UserFacingError("last-admin-manager");
		}

		await tx.delete(schema.users).where(eq(schema.users.id, id));

		// Snapshot the label now: once the row is gone the audit log can only show the uuid.
		return { subjectId: id, subjectLabel: `${user.name} (${user.email})` };
	},
});
