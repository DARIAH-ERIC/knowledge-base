import * as schema from "@dariah-eric/database/schema";

import { type Database, type Transaction, db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";

type AdminManagementActor = Pick<schema.User, "canManageAdmins" | "role">;

export function canManageAdminAccounts(
	user: Pick<AdminManagementActor, "canManageAdmins" | "role">,
): boolean {
	return user.role === "admin" && user.canManageAdmins;
}

export async function countAdminManagers(executor: Database | Transaction = db): Promise<number> {
	return executor.$count(
		schema.users,
		and(eq(schema.users.role, "admin"), eq(schema.users.canManageAdmins, true)),
	);
}

export function isRemovingAdminManagementPrivilege(
	existingUser: Pick<schema.User, "canManageAdmins" | "role">,
	nextUser: Pick<schema.User, "canManageAdmins" | "role">,
): boolean {
	return existingUser.role === "admin" && existingUser.canManageAdmins && !nextUser.canManageAdmins;
}
