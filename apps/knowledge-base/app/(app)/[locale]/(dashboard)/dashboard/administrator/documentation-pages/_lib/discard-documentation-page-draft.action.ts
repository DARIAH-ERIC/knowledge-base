"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { documentationPagesLifecycleAdapter } from "@/lib/data/documentation-pages.lifecycle-adapter";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function discardDocumentationPageDraftAction(documentId: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await discardDraftVersion(tx, documentId, documentationPagesLifecycleAdapter);
	});

	revalidatePath("/[locale]/dashboard/administrator/documentation-pages", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/administrator/documentation-pages", locale });
}
