"use server";

import { eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAuthenticated } from "@/lib/auth/session";

export async function endContributionAction(id: string, end: Date): Promise<void> {
	await assertAuthenticated();

	const contribution = await db.query.personsToOrganisationalUnits.findFirst({
		where: { id },
		columns: { duration: true },
	});

	if (contribution == null) return;

	await db
		.update(schema.personsToOrganisationalUnits)
		.set({ duration: { start: contribution.duration.start, end } })
		.where(eq(schema.personsToOrganisationalUnits.id, id));

	revalidatePath("/[locale]/dashboard/administrator", "layout");
}
