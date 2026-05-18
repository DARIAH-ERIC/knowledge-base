"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";

export async function endUnitRelationAction(id: string, end: Date): Promise<void> {
	await assertAdmin();

	const relation = await db.query.organisationalUnitsRelations.findFirst({
		where: { id },
		columns: { duration: true, unitId: true },
	});

	if (relation == null) {
		return;
	}

	await db.transaction(async (tx) => {
		await tx
			.update(schema.organisationalUnitsRelations)
			.set({ duration: { start: relation.duration.start, end } })
			.where(eq(schema.organisationalUnitsRelations.id, id));

		await touchVersion(tx, relation.unitId);
	});

	revalidatePath("/[locale]/dashboard/administrator", "layout");
}
