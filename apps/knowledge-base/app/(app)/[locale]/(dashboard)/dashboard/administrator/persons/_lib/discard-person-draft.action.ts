"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { personsLifecycleAdapter } from "@/lib/data/persons.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function discardPersonDraftAction(documentId: string): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
		await discardDraftVersion(tx, documentId, personsLifecycleAdapter);
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "discard_draft",
		subjectType: "persons",
		subjectId: documentId,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/administrator/persons", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/administrator/persons", locale });
}
