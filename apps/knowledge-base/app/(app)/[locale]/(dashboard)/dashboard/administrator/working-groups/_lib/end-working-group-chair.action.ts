"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { ensureOrganisationalUnitDraftVersion } from "@/lib/data/organisational-unit-drafts";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function endWorkingGroupChairAction(id: string, end: Date): Promise<void> {
	await assertAdmin();

	const relation = await db.query.personsToOrganisationalUnits.findFirst({
		where: { id },
		columns: { duration: true, organisationalUnitId: true, personId: true, roleTypeId: true },
	});

	if (relation == null) {
		return;
	}

	await db.transaction(async (tx) => {
		const draftUnitId = await ensureOrganisationalUnitDraftVersion(
			tx,
			relation.organisationalUnitId,
		);
		const draftRelation =
			draftUnitId === relation.organisationalUnitId
				? { id }
				: await tx.query.personsToOrganisationalUnits.findFirst({
						where: {
							personId: relation.personId,
							organisationalUnitId: draftUnitId,
							roleTypeId: relation.roleTypeId,
						},
						columns: { id: true },
					});

		if (draftRelation == null) {
			return;
		}

		await tx
			.update(schema.personsToOrganisationalUnits)
			.set({ duration: { start: relation.duration.start, end } })
			.where(eq(schema.personsToOrganisationalUnits.id, draftRelation.id));

		await touchVersion(tx, draftUnitId);
	});

	await dispatchWebhook({ type: "working-groups" });
	revalidatePath("/[locale]/dashboard/administrator/working-groups", "layout");
}
