"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { socialMediaKpiCategoryEnum } from "@dariah-eric/database/schema";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import * as v from "valibot";

import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";

const UpsertCountryReportSocialMediaKpisSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	kpis: v.optional(
		v.record(
			v.string(),
			v.record(
				v.picklist(socialMediaKpiCategoryEnum),
				v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(0)),
			),
		),
	),
});

export async function upsertCountryReportSocialMediaKpisAction(formData: FormData): Promise<void> {
	if (!(await globalPostRequestRateLimit())) return;

	const result = v.safeParse(UpsertCountryReportSocialMediaKpisSchema, getFormDataValues(formData));
	if (!result.success) return;

	const { id, kpis } = result.output;

	const locale = await getLocale();
	const { user } = await assertAuthenticated();
	await assertCan(user, "update", { type: "country_report", id });

	await db.transaction(async (tx) => {
		for (const [socialMediaId, kpiValues] of Object.entries(kpis ?? {})) {
			for (const [kpi, value] of Object.entries(kpiValues)) {
				const existing = await tx.query.countryReportSocialMediaKpis.findFirst({
					where: {
						countryReportId: id,
						socialMediaId,
						kpi: kpi as (typeof socialMediaKpiCategoryEnum)[number],
					},
					columns: { id: true },
				});

				if (existing != null) {
					await tx
						.update(schema.countryReportSocialMediaKpis)
						.set({ value })
						.where(eq(schema.countryReportSocialMediaKpis.id, existing.id));
				} else {
					await tx.insert(schema.countryReportSocialMediaKpis).values({
						countryReportId: id,
						socialMediaId,
						kpi: kpi as (typeof socialMediaKpiCategoryEnum)[number],
						value,
					});
				}
			}
		}
	});

	revalidatePath("/[locale]/dashboard/reporting", "layout");

	redirect({ href: `/dashboard/reporting/country-reports/${id}/edit/social-media`, locale });
}
