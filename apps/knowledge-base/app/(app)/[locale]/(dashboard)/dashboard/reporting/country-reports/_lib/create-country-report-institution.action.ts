"use server";

import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";

import { CreateCountryReportInstitutionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/create-country-report-institution.schema";
import { assertCan } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const createCountryReportInstitutionAction = createMutationAction({
	schema: CreateCountryReportInstitutionActionInputSchema,
	requireAuth: true,
	audit: { action: "create", subjectType: "country_report" },
	revalidate: "/[locale]/dashboard/reporting",

	async preCheck({ input, ctx }) {
		const t = await getExtracted();
		await assertCan(ctx.user!, "update", {
			type: "country_report",
			id: input.countryReportId,
		});

		const existing = await db.query.countryReportInstitutions.findFirst({
			where: {
				countryReportId: input.countryReportId,
				organisationalUnitId: input.organisationalUnitId,
			},
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({
				message: t("This institution is already listed."),
			});
		}

		return undefined;
	},

	async mutate(tx, input) {
		const t = await getExtracted();

		await tx.insert(schema.countryReportInstitutions).values({
			countryReportId: input.countryReportId,
			organisationalUnitId: input.organisationalUnitId,
		});

		return { subjectId: input.countryReportId, successMessage: t("Added.") };
	},
});
