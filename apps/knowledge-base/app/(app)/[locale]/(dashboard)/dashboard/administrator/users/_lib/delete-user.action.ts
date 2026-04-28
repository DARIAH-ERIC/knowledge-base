"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";

export async function deleteUserAction(id: string): Promise<void> {
	const { user: currentUser } = await assertAdmin();

	if (currentUser.id === id) {
		throw new Error("Cannot delete your own account.");
	}

	await db.delete(schema.users).where(eq(schema.users.id, id));

	revalidatePath("/[locale]/dashboard/administrator/users", "layout");
}
