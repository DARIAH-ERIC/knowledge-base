"use server";

import { eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";

export async function deleteContributionAction(id: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		await tx
			.delete(schema.countryReportContributions)
			.where(eq(schema.countryReportContributions.personToOrgUnitId, id));

		await tx
			.delete(schema.personsToOrganisationalUnits)
			.where(eq(schema.personsToOrganisationalUnits.id, id));
	});

	revalidatePath("/[locale]/dashboard/administrator/contributions", "layout");
}
