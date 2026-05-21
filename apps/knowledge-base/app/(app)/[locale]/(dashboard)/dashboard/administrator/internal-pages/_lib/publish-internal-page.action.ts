"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { internalPagesLifecycleAdapter } from "@/lib/data/internal-pages.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function publishInternalPageAction(documentId: string): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
		await publishVersion(tx, documentId, internalPagesLifecycleAdapter);
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "publish",
		subjectType: "internal_pages",
		subjectId: documentId,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/administrator/internal-pages", "layout");
	revalidatePath("/[locale]/privacy-policy", "page");
	revalidatePath("/[locale]/terms-of-use", "page");

	const locale = await getLocale();
	redirect({ href: "/dashboard/administrator/internal-pages", locale });
}
