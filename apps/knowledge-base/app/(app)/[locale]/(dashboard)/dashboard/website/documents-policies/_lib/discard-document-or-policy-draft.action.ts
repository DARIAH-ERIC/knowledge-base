"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { documentsPoliciesLifecycleAdapter } from "@/lib/data/documents-policies.lifecycle-adapter";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function discardDocumentOrPolicyDraftAction(documentId: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await discardDraftVersion(tx, documentId, documentsPoliciesLifecycleAdapter);
	});

	revalidatePath("/[locale]/dashboard/website/documents-policies", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/website/documents-policies", locale });
}
