"use server";

import { eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";

import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";

export async function confirmWorkingGroupReportAction(formData: FormData): Promise<void> {
	const id = formData.get("id");
	if (typeof id !== "string") return;

	const locale = await getLocale();
	const { user } = await assertAuthenticated();
	await assertCan(user, "confirm", { type: "working_group_report", id });

	await db
		.update(schema.workingGroupReports)
		.set({ status: "accepted" })
		.where(eq(schema.workingGroupReports.id, id));

	revalidatePath("/[locale]/dashboard/reporting", "layout");

	redirect({ href: `/dashboard/reporting/working-group-reports/${id}/edit`, locale });
}
