"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { ensureOrganisationalUnitDraftVersion } from "@/lib/data/organisational-unit-drafts";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";

export async function endUnitRelationAction(id: string, end: Date): Promise<void> {
	const auditSession = await assertAdmin();

	const relation = await db.query.organisationalUnitsRelations.findFirst({
		where: { id },
		columns: { duration: true, relatedUnitId: true, status: true, unitId: true },
	});

	if (relation == null) {
		return;
	}

	await db.transaction(async (tx) => {
		const draftUnitId = await ensureOrganisationalUnitDraftVersion(tx, relation.unitId);
		const draftRelation =
			draftUnitId === relation.unitId
				? { id }
				: await tx.query.organisationalUnitsRelations.findFirst({
						where: {
							unitId: draftUnitId,
							relatedUnitId: relation.relatedUnitId,
							status: relation.status,
						},
						columns: { id: true },
					});

		if (draftRelation == null) {
			return;
		}

		await tx
			.update(schema.organisationalUnitsRelations)
			.set({ duration: { start: relation.duration.start, end } })
			.where(eq(schema.organisationalUnitsRelations.id, draftRelation.id));

		await touchVersion(tx, draftUnitId);
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "relation_end",
		subjectType: "end_unit_relation",
		subjectId: id,
		summary: { end },
	});

	revalidatePath("/[locale]/dashboard/administrator", "layout");
}
