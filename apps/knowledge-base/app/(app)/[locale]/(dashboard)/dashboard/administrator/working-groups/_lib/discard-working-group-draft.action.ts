"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { discardDraftVersion } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";

export async function discardWorkingGroupDraftAction(documentId: string): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
		await discardDraftVersion(tx, documentId, organisationalUnitsLifecycleAdapter);
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "discard_draft",
		subjectType: "working_groups",
		subjectId: documentId,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/administrator/working-groups", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/administrator/working-groups", locale });
}
