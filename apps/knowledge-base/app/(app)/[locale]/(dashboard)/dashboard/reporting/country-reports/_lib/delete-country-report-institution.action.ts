"use server";

import * as schema from "@dariah-eric/database/schema";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";

import {
	getAuditSubjectIdFromFormData,
	getAuditSummaryFromFormData,
	recordAuditEvent,
} from "@/lib/audit/audit-log";
import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";

export async function deleteCountryReportInstitutionAction(formData: FormData): Promise<void> {
	if (!(await globalPostRequestRateLimit())) {
		return;
	}

	const institutionId = formData.get("institutionId");
	const countryReportId = formData.get("countryReportId");
	if (typeof institutionId !== "string" || typeof countryReportId !== "string") {
		return;
	}

	const { user } = await assertAuthenticated();
	await assertCan(user, "update", { type: "country_report", id: countryReportId });

	await db
		.delete(schema.countryReportInstitutions)
		.where(eq(schema.countryReportInstitutions.id, institutionId));

	await recordAuditEvent(db, {
		actorUserId: user.id,
		action: "delete",
		subjectType: "country_report",
		subjectId: getAuditSubjectIdFromFormData(formData),
		summary: getAuditSummaryFromFormData(formData),
	});

	revalidatePath("/[locale]/dashboard/reporting", "layout");
}
