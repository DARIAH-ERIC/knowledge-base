"use server";

import { eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAuthenticated } from "@/lib/auth/session";

export async function deleteNavigationItemAction(id: string): Promise<void> {
	await assertAuthenticated();

	await db.delete(schema.navigationItems).where(eq(schema.navigationItems.id, id));

	revalidatePath("/[locale]/dashboard/website/navigation", "layout");
}
