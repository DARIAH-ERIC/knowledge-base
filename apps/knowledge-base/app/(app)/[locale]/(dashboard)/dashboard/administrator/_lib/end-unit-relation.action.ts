"use server";

import { eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAuthenticated } from "@/lib/auth/session";

export async function endUnitRelationAction(id: string, end: Date): Promise<void> {
	await assertAuthenticated();

	const relation = await db.query.organisationalUnitsRelations.findFirst({
		where: { id },
		columns: { duration: true },
	});

	if (relation == null) return;

	await db
		.update(schema.organisationalUnitsRelations)
		.set({ duration: { start: relation.duration.start, end } })
		.where(eq(schema.organisationalUnitsRelations.id, id));

	revalidatePath("/[locale]/dashboard/administrator", "layout");
}
