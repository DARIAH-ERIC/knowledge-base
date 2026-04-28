"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";

export async function deleteSocialMediaAction(id: string): Promise<void> {
	await assertAdmin();

	await db.delete(schema.socialMedia).where(eq(schema.socialMedia.id, id));

	revalidatePath("/[locale]/dashboard/administrator/social-media", "layout");
}
