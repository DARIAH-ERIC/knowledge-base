"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { deleteDocumentVersionTail } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { eq, or } from "@/lib/db/sql";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function deleteNationalConsortiumAction(id: string): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
		const entityVersion = await tx.query.entityVersions.findFirst({
			where: { id },
			columns: { id: true, entityId: true },
		});

		assert(entityVersion);

		await tx
			.delete(schema.organisationalUnitsRelations)
			.where(
				or(
					eq(schema.organisationalUnitsRelations.unitId, entityVersion.id),
					eq(schema.organisationalUnitsRelations.relatedUnitId, entityVersion.id),
				),
			);

		await tx
			.delete(schema.organisationalUnits)
			.where(eq(schema.organisationalUnits.id, entityVersion.id));
		await deleteDocumentVersionTail(tx, entityVersion.id, entityVersion.entityId);
	});

	await dispatchWebhook({ type: "members-partners" });
	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "delete",
		subjectType: "national_consortia",
		subjectId: id,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/administrator/national-consortia", "layout");
}
