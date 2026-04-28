"use server";

import { eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";

export async function deleteSocialMediaAction(id: string): Promise<void> {
	await assertAdmin();

	await db.delete(schema.socialMedia).where(eq(schema.socialMedia.id, id));

	revalidatePath("/[locale]/dashboard/administrator/social-media", "layout");
}
