"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { spotlightArticlesLifecycleAdapter } from "@/lib/data/spotlight-articles.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function discardSpotlightArticleDraftAction(documentId: string): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
		await discardDraftVersion(tx, documentId, spotlightArticlesLifecycleAdapter);
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "discard_draft",
		subjectType: "spotlight_articles",
		subjectId: documentId,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/website/spotlight-articles", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/website/spotlight-articles", locale });
}
