"use server";

import { eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";

import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";

export async function deleteWorkingGroupReportEventAction(formData: FormData): Promise<void> {
	if (!(await globalPostRequestRateLimit())) return;

	const eventId = formData.get("eventId");
	const workingGroupReportId = formData.get("workingGroupReportId");
	if (typeof eventId !== "string" || typeof workingGroupReportId !== "string") return;

	const { user } = await assertAuthenticated();
	await assertCan(user, "update", { type: "working_group_report", id: workingGroupReportId });

	await db
		.delete(schema.workingGroupReportEvents)
		.where(eq(schema.workingGroupReportEvents.id, eventId));

	revalidatePath("/[locale]/dashboard/reporting", "layout");
}
