"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export async function endWorkingGroupChairAction(id: string, end: Date): Promise<void> {
	await assertAdmin();

	const relation = await db.query.personsToOrganisationalUnits.findFirst({
		where: { id },
		columns: { duration: true, organisationalUnitId: true },
	});

	if (relation == null) {
		return;
	}

	await db.transaction(async (tx) => {
		await tx
			.update(schema.personsToOrganisationalUnits)
			.set({ duration: { start: relation.duration.start, end } })
			.where(eq(schema.personsToOrganisationalUnits.id, id));

		await touchVersion(tx, relation.organisationalUnitId);
	});

	await dispatchWebhook({ type: "working-groups" });
	revalidatePath("/[locale]/dashboard/administrator/working-groups", "layout");
}
