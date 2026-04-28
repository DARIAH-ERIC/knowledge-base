"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";

export async function endWorkingGroupChairAction(id: string, end: Date): Promise<void> {
	await assertAdmin();

	const relation = await db.query.personsToOrganisationalUnits.findFirst({
		where: { id },
		columns: { duration: true },
	});

	if (relation == null) return;

	await db
		.update(schema.personsToOrganisationalUnits)
		.set({ duration: { start: relation.duration.start, end } })
		.where(eq(schema.personsToOrganisationalUnits.id, id));

	revalidatePath("/[locale]/dashboard/administrator/working-groups", "layout");
}
