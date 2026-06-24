"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertCanManageCountryInstitutionRelation } from "@/app/(app)/[locale]/(dashboard)/dashboard/countries/[code]/edit/_lib/authorize-country-institution-relation";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";

/** Delegated counterpart of `deleteUnitRelationAction` for country partner-institution relations. */
export async function deleteDelegatedUnitRelationAction(id: string): Promise<void> {
	const { user } = await assertAuthenticated();

	const relation = await db.query.organisationalUnitsRelations.findFirst({
		where: { id },
		columns: { unitDocumentId: true, relatedUnitDocumentId: true },
	});

	if (relation == null) {
		return;
	}

	await assertCanManageCountryInstitutionRelation(user, {
		institutionDocumentId: relation.unitDocumentId,
		relatedUnitDocumentId: relation.relatedUnitDocumentId,
	});

	await db
		.delete(schema.organisationalUnitsRelations)
		.where(eq(schema.organisationalUnitsRelations.id, id));

	await recordAuditEvent(db, {
		actorUserId: user.id,
		action: "delete",
		subjectType: "unit_relations",
		subjectId: id,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/countries", "layout");
}
