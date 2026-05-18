"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";

export async function endContributionAction(id: string, end: Date): Promise<void> {
	await assertAdmin();

	const contribution = await db.query.personsToOrganisationalUnits.findFirst({
		where: { id },
		columns: { duration: true, organisationalUnitId: true },
	});

	if (contribution == null) {
		return;
	}

	await db.transaction(async (tx) => {
		await tx
			.update(schema.personsToOrganisationalUnits)
			.set({ duration: { start: contribution.duration.start, end } })
			.where(eq(schema.personsToOrganisationalUnits.id, id));

		await touchVersion(tx, contribution.organisationalUnitId);
	});

	revalidatePath("/[locale]/dashboard/administrator", "layout");
}
