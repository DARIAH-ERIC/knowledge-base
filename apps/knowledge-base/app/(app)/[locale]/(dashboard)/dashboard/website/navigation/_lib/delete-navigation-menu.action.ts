"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function deleteNavigationMenuAction(id: string): Promise<void> {
	await assertAuthenticated();

	await db.delete(schema.navigationMenus).where(eq(schema.navigationMenus.id, id));

	after(async () => {
		await dispatchWebhook({ type: "navigation" });
	});

	revalidatePath("/[locale]/dashboard/website/navigation", "layout");
}
