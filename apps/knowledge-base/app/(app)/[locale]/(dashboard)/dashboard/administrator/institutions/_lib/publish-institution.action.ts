"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function publishInstitutionAction(documentId: string): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
		await publishVersion(tx, documentId, organisationalUnitsLifecycleAdapter);
	});

	after(async () => {
		await syncWebsiteDocumentForEntity(documentId);
		await dispatchWebhook({ type: "members-partners" });
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "publish",
		subjectType: "institutions",
		subjectId: documentId,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/administrator/institutions", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/administrator/institutions", locale });
}
