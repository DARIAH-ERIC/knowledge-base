"use server";

import { eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";

import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";

export async function deleteCountryReportInstitutionAction(formData: FormData): Promise<void> {
	if (!(await globalPostRequestRateLimit())) return;

	const institutionId = formData.get("institutionId");
	const countryReportId = formData.get("countryReportId");
	if (typeof institutionId !== "string" || typeof countryReportId !== "string") return;

	const { user } = await assertAuthenticated();
	await assertCan(user, "update", { type: "country_report", id: countryReportId });

	await db
		.delete(schema.countryReportInstitutions)
		.where(eq(schema.countryReportInstitutions.id, institutionId));

	revalidatePath("/[locale]/dashboard/reporting", "layout");
}
