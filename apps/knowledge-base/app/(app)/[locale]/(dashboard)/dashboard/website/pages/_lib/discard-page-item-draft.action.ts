"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { pagesLifecycleAdapter } from "@/lib/data/pages.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function discardPageItemDraftAction(documentId: string): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
		await discardDraftVersion(tx, documentId, pagesLifecycleAdapter);
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "discard_draft",
		subjectType: "pages",
		subjectId: documentId,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/website/pages", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/website/pages", locale });
}
