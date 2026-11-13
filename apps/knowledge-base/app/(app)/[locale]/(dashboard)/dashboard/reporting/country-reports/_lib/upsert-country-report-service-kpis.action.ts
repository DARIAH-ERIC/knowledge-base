"use server";

import * as schema from "@dariah-eric/database/schema";
import { serviceKpiCategoryEnum } from "@dariah-eric/database/schema";
import { getExtracted } from "next-intl/server";
import * as v from "valibot";

import { assertCan, assertReportEditable } from "@/lib/auth/permissions";
import { countryReportRevalidatePaths } from "@/lib/data/reporting-urls";
import { and, eq, inArray } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const UpsertCountryReportServiceKpisSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	kpis: v.optional(
		v.record(
			v.string(),
			v.record(
				v.picklist(serviceKpiCategoryEnum),
				v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(0)),
			),
		),
	),
	/** Service ids the reporter marked as important; unticked checkboxes are not submitted. */
	important: v.optional(v.record(v.string(), v.literal("on"))),
});

/**
 * Saves the per-service KPI values and "important" marks for a country report. Replace-set
 * semantics scoped to the country's services (resolved via its consortium): a removed/blanked
 * metric is dropped from the form data, so re-writing the set is what clears it, and a forged
 * `serviceId` outside the country's services is ignored.
 */
export const upsertCountryReportServiceKpisAction = createMutationAction({
	schema: UpsertCountryReportServiceKpisSchema,
	requireAuth: true,
	audit: { action: "update", subjectType: "country_reports" },
	revalidate: countryReportRevalidatePaths,

	async preCheck({ input, ctx }) {
		await assertCan(ctx.user, "update", { type: "country_report", id: input.id });
		await assertReportEditable(ctx.user, { type: "country_report", id: input.id });
		return undefined;
	},

	async mutate(tx, input) {
		const t = await getExtracted();

		const memberships = await tx.query.countryReportServices.findMany({
			where: { countryReportId: input.id },
			columns: { serviceId: true },
			with: { service: { columns: {}, with: { type: { columns: { type: true } } } } },
		});
		const allowedServiceIds = new Set(memberships.map((membership) => membership.serviceId));

		const rows = Object.entries(input.kpis ?? {}).flatMap(([serviceId, kpiValues]) => {
			if (!allowedServiceIds.has(serviceId)) {
				return [];
			}
			return Object.entries(kpiValues).map(([kpi, value]) => {
				return {
					countryReportId: input.id,
					serviceId,
					kpi: kpi as (typeof serviceKpiCategoryEnum)[number],
					value,
				};
			});
		});

		if (allowedServiceIds.size > 0) {
			await tx
				.delete(schema.countryReportServiceKpis)
				.where(
					and(
						eq(schema.countryReportServiceKpis.countryReportId, input.id),
						inArray(schema.countryReportServiceKpis.serviceId, [...allowedServiceIds]),
					),
				);

			if (rows.length > 0) {
				await tx.insert(schema.countryReportServiceKpis).values(rows);
			}

			// Core services are sized by their type, so a mark on one would have no effect.
			const importantServiceIds = new Set(
				memberships
					.filter(
						(membership) =>
							membership.service.type.type !== "core" &&
							Object.hasOwn(input.important ?? {}, membership.serviceId),
					)
					.map((membership) => membership.serviceId),
			);
			const otherServiceIds = [...allowedServiceIds].filter((id) => !importantServiceIds.has(id));
			for (const [isImportant, serviceIds] of [
				[true, [...importantServiceIds]],
				[false, otherServiceIds],
			] as const) {
				if (serviceIds.length > 0) {
					await tx
						.update(schema.countryReportServices)
						.set({ isImportant })
						.where(
							and(
								eq(schema.countryReportServices.countryReportId, input.id),
								inArray(schema.countryReportServices.serviceId, serviceIds),
							),
						);
				}
			}
		}

		return { subjectId: input.id, successMessage: t("Saved.") };
	},
});
