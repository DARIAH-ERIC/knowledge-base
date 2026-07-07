"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";
import { resolveOrganisationalUnitChangeEvents } from "@/lib/webhook/resolve-organisational-unit-change-events";

export async function deleteUnitRelationAction(id: string): Promise<void> {
	const auditSession = await assertAdmin();

	const relation = await db.query.organisationalUnitsRelations.findFirst({
		where: { id },
		columns: { unitDocumentId: true, relatedUnitDocumentId: true },
	});

	await db
		.delete(schema.organisationalUnitsRelations)
		.where(eq(schema.organisationalUnitsRelations.id, id));

	await recordAuditEvent(db, {
		actorUserId: auditSession.user.id,
		action: "delete",
		subjectType: "unit_relations",
		subjectId: id,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/administrator", "layout");
	if (relation != null) {
		await dispatchWebhook({
			events: await resolveOrganisationalUnitChangeEvents(db, [
				relation.unitDocumentId,
				relation.relatedUnitDocumentId,
			]),
		});
	}
}
