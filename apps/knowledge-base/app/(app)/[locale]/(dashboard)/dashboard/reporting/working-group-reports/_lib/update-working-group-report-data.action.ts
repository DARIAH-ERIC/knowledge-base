"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import * as v from "valibot";

import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";

const UpdateWorkingGroupReportDataSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	numberOfMembers: v.optional(v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(0))),
	mailingList: v.optional(v.string()),
});

export async function updateWorkingGroupReportDataAction(formData: FormData): Promise<void> {
	if (!(await globalPostRequestRateLimit())) return;

	const result = v.safeParse(UpdateWorkingGroupReportDataSchema, getFormDataValues(formData));
	if (!result.success) return;

	const { id, numberOfMembers, mailingList } = result.output;

	const locale = await getLocale();
	const { user } = await assertAuthenticated();
	await assertCan(user, "update", { type: "working_group_report", id });

	await db
		.update(schema.workingGroupReports)
		.set({
			numberOfMembers: numberOfMembers ?? null,
			mailingList: mailingList ?? null,
		})
		.where(eq(schema.workingGroupReports.id, id));

	revalidatePath("/[locale]/dashboard/reporting", "layout");

	redirect({ href: `/dashboard/reporting/working-group-reports/${id}/edit/data`, locale });
}
