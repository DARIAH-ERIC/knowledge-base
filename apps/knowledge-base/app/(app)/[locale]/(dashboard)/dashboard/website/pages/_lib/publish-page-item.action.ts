"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { pagesLifecycleAdapter } from "@/lib/data/pages.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function publishPageItemAction(documentId: string): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
		await publishVersion(tx, documentId, pagesLifecycleAdapter);
	});

	after(async () => {
		await syncWebsiteDocumentForEntity(documentId);
		await dispatchWebhook({ type: "pages" });
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "publish",
		subjectType: "pages",
		subjectId: documentId,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/website/pages", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/website/pages", locale });
}
