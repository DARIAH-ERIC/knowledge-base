"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { projectsLifecycleAdapter } from "@/lib/data/projects.lifecycle-adapter";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function publishProjectAction(documentId: string): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
		await publishVersion(tx, documentId, projectsLifecycleAdapter);
	});

	after(async () => {
		await syncWebsiteDocumentForEntity(documentId);
		await dispatchWebhook({ type: "dariah-projects" });
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "publish",
		subjectType: "projects",
		subjectId: documentId,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/administrator/projects", "layout");

	const locale = await getLocale();
	redirect({ href: "/dashboard/administrator/projects", locale });
}
