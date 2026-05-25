"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { ensureOrganisationalUnitDraftVersion } from "@/lib/data/organisational-unit-drafts";
import { ensurePersonDraftVersion } from "@/lib/data/person-drafts";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";

export async function endContributionAction(id: string, end: Date): Promise<void> {
	const auditSession = await assertAdmin();

	const contribution = await db.query.personsToOrganisationalUnits.findFirst({
		where: { id },
		columns: { duration: true, organisationalUnitId: true, personId: true, roleTypeId: true },
	});

	if (contribution == null) {
		return;
	}

	await db.transaction(async (tx) => {
		const draftPersonId = await ensurePersonDraftVersion(tx, contribution.personId);
		const draftOrganisationalUnitId = await ensureOrganisationalUnitDraftVersion(
			tx,
			contribution.organisationalUnitId,
		);
		const draftContribution =
			draftPersonId === contribution.personId &&
			draftOrganisationalUnitId === contribution.organisationalUnitId
				? { id }
				: await tx.query.personsToOrganisationalUnits.findFirst({
						where: {
							personId: draftPersonId,
							organisationalUnitId: draftOrganisationalUnitId,
							roleTypeId: contribution.roleTypeId,
						},
						columns: { id: true },
					});

		if (draftContribution == null) {
			return;
		}

		await tx
			.update(schema.personsToOrganisationalUnits)
			.set({ duration: { start: contribution.duration.start, end } })
			.where(eq(schema.personsToOrganisationalUnits.id, draftContribution.id));

		await touchVersion(tx, draftPersonId);
		await touchVersion(tx, draftOrganisationalUnitId);
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession.user.id,
		action: "relation_end",
		subjectType: "end_contribution",
		subjectId: id,
		summary: { end },
	});

	revalidatePath("/[locale]/dashboard/administrator", "layout");
}
