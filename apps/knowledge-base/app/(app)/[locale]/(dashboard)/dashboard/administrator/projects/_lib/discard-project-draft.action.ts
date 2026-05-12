"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { projectsLifecycleAdapter } from "@/lib/data/projects.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function discardProjectDraftAction(documentId: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await discardDraftVersion(tx, documentId, projectsLifecycleAdapter);
	});

	revalidatePath("/[locale]/dashboard/administrator/projects", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/administrator/projects", locale });
}
