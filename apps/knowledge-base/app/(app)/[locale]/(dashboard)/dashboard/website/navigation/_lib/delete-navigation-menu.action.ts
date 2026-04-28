"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";

export async function deleteNavigationMenuAction(id: string): Promise<void> {
	await assertAuthenticated();

	await db.delete(schema.navigationMenus).where(eq(schema.navigationMenus.id, id));

	revalidatePath("/[locale]/dashboard/website/navigation", "layout");
}
