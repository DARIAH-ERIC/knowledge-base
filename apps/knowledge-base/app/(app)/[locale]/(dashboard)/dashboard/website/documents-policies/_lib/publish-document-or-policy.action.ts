"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getLocale } from "next-intl/server";

import { assertAdmin } from "@/lib/auth/session";
import { documentsPoliciesLifecycleAdapter } from "@/lib/data/documents-policies.lifecycle-adapter";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function publishDocumentOrPolicyAction(documentId: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await publishVersion(tx, documentId, documentsPoliciesLifecycleAdapter);
	});

	after(async () => {
		await syncWebsiteDocumentForEntity(documentId);
		await dispatchWebhook({ type: "documents-policies" });
	});

	revalidatePath("/[locale]/dashboard/website/documents-policies", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/website/documents-policies", locale });
}
