"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";

export async function deleteContributionAction(id: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		const contribution = await tx.query.personsToOrganisationalUnits.findFirst({
			where: { id },
			columns: { organisationalUnitId: true },
		});

		await tx
			.delete(schema.countryReportContributions)
			.where(eq(schema.countryReportContributions.personToOrgUnitId, id));

		await tx
			.delete(schema.personsToOrganisationalUnits)
			.where(eq(schema.personsToOrganisationalUnits.id, id));

		if (contribution != null) {
			await touchVersion(tx, contribution.organisationalUnitId);
		}
	});

	revalidatePath("/[locale]/dashboard/administrator/contributions", "layout");
	revalidatePath("/[locale]/dashboard/administrator/person-relations", "layout");
}
