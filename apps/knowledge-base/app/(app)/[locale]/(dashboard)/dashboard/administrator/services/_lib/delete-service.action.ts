"use server";

import { eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";

export async function deleteServiceAction(id: string): Promise<void> {
	await assertAdmin();

	await db.delete(schema.services).where(eq(schema.services.id, id));

	revalidatePath("/[locale]/dashboard/administrator/services", "layout");
}
