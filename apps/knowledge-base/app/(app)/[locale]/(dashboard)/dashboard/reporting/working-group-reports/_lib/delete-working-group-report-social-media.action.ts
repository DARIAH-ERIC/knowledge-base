"use server";

import { eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";

import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";

export async function deleteWorkingGroupReportSocialMediaAction(formData: FormData): Promise<void> {
	if (!(await globalPostRequestRateLimit())) return;

	const claimedId = formData.get("claimedId");
	const workingGroupReportId = formData.get("workingGroupReportId");
	if (typeof claimedId !== "string" || typeof workingGroupReportId !== "string") return;

	const { user } = await assertAuthenticated();
	await assertCan(user, "update", { type: "working_group_report", id: workingGroupReportId });

	await db
		.delete(schema.workingGroupReportSocialMedia)
		.where(eq(schema.workingGroupReportSocialMedia.id, claimedId));

	revalidatePath("/[locale]/dashboard/reporting", "layout");
}
