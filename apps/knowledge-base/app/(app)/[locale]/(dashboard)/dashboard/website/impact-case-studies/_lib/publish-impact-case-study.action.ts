"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { assertAdmin } from "@/lib/auth/session";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { impactCaseStudiesLifecycleAdapter } from "@/lib/data/impact-case-studies.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function publishImpactCaseStudyAction(documentId: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await publishVersion(tx, documentId, impactCaseStudiesLifecycleAdapter);
	});

	after(async () => {
		await syncWebsiteDocumentForEntity(documentId);
		await dispatchWebhook({ type: "impact-case-studies" });
	});

	revalidatePath("/[locale]/dashboard/website/impact-case-studies", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/website/impact-case-studies", locale });
}
