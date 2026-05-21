"use server";

import { assert } from "@acdh-oeaw/lib";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { eventsLifecycleAdapter } from "@/lib/data/events.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function discardEventDraftAction(documentId: string): Promise<void> {
	const auditSession = await assertAdmin();

	assert(documentId, "Missing documentId.");

	await db.transaction(async (tx) => {
		await discardDraftVersion(tx, documentId, eventsLifecycleAdapter);
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "discard_draft",
		subjectType: "events",
		subjectId: documentId,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/website/events", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/website/events", locale });
}
