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

export async function deleteContributionAction(id: string): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
		const contribution = await tx.query.personsToOrganisationalUnits.findFirst({
			where: { id },
			columns: { organisationalUnitId: true, personId: true, roleTypeId: true },
		});

		if (contribution == null) {
			return;
		}

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
			.delete(schema.countryReportContributions)
			.where(eq(schema.countryReportContributions.personToOrgUnitId, draftContribution.id));

		await tx
			.delete(schema.personsToOrganisationalUnits)
			.where(eq(schema.personsToOrganisationalUnits.id, draftContribution.id));

		await touchVersion(tx, draftPersonId);
		await touchVersion(tx, draftOrganisationalUnitId);
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "delete",
		subjectType: "contributions",
		subjectId: id,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/administrator/contributions", "layout");
	revalidatePath("/[locale]/dashboard/administrator/person-relations", "layout");
}
