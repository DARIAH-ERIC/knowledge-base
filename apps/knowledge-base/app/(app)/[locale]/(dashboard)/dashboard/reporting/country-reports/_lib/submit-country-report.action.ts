"use server";

import { eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";

import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";

export async function submitCountryReportAction(formData: FormData): Promise<void> {
	const id = formData.get("id");
	if (typeof id !== "string") return;

	const locale = await getLocale();
	const { user } = await assertAuthenticated();
	await assertCan(user, "update", { type: "country_report", id });

	await db
		.update(schema.countryReports)
		.set({ status: "submitted" })
		.where(eq(schema.countryReports.id, id));

	revalidatePath("/[locale]/dashboard/reporting", "layout");

	redirect({ href: `/dashboard/reporting/country-reports/${id}/edit/confirm`, locale });
}
