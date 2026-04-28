"use server";

import { eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";

import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";

export async function deleteCountryReportContributionAction(formData: FormData): Promise<void> {
	if (!(await globalPostRequestRateLimit())) return;

	const contributionId = formData.get("contributionId");
	const countryReportId = formData.get("countryReportId");
	if (typeof contributionId !== "string" || typeof countryReportId !== "string") return;

	const { user } = await assertAuthenticated();
	await assertCan(user, "update", { type: "country_report", id: countryReportId });

	await db
		.delete(schema.countryReportContributions)
		.where(eq(schema.countryReportContributions.id, contributionId));

	revalidatePath("/[locale]/dashboard/reporting", "layout");
}
