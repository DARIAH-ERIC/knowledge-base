"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { internalPagesLifecycleAdapter } from "@/lib/data/internal-pages.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function discardInternalPageDraftAction(documentId: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await discardDraftVersion(tx, documentId, internalPagesLifecycleAdapter);
	});

	revalidatePath("/[locale]/dashboard/administrator/internal-pages", "layout");
	revalidatePath("/[locale]/privacy-policy", "page");
	revalidatePath("/[locale]/terms-of-use", "page");

	const locale = await getLocale();
	redirect({ href: "/dashboard/administrator/internal-pages", locale });
}
