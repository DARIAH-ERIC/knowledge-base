"use server";

import { eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";

export async function deleteUserAction(id: string): Promise<void> {
	const { user: currentUser } = await assertAdmin();

	if (currentUser.id === id) {
		throw new Error("Cannot delete your own account.");
	}

	await db.delete(schema.users).where(eq(schema.users.id, id));

	revalidatePath("/[locale]/dashboard/administrator/users", "layout");
}
