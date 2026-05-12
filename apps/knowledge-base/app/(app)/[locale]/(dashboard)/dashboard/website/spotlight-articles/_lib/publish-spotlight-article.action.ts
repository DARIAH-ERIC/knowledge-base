"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { assertAdmin } from "@/lib/auth/session";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { spotlightArticlesLifecycleAdapter } from "@/lib/data/spotlight-articles.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function publishSpotlightArticleAction(documentId: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await publishVersion(tx, documentId, spotlightArticlesLifecycleAdapter);
	});

	after(async () => {
		await syncWebsiteDocumentForEntity(documentId);
		await dispatchWebhook({ type: "spotlight-articles" });
	});

	revalidatePath("/[locale]/dashboard/website/spotlight-articles", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/website/spotlight-articles", locale });
}
