"use server";

import { assert } from "@acdh-oeaw/lib";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { newsLifecycleAdapter } from "@/lib/data/news.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function publishNewsItemAction(documentId: string): Promise<void> {
	const auditSession = await assertAdmin();

	assert(documentId, "Missing documentId.");

	await db.transaction(async (tx) => {
		await publishVersion(tx, documentId, newsLifecycleAdapter);
	});

	after(async () => {
		await syncWebsiteDocumentForEntity(documentId);
		await dispatchWebhook({ type: "news" });
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "publish",
		subjectType: "news",
		subjectId: documentId,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/website/news", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/website/news", locale });
}
