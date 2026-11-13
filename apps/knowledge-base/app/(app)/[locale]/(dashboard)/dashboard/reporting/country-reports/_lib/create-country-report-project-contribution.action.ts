"use server";

import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";

import { CreateCountryReportProjectContributionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/create-country-report-project-contribution.schema";
import { assertCan, assertReportEditable } from "@/lib/auth/permissions";
import { isCountryReportProjectOption } from "@/lib/data/country-report-projects";
import { countryReportRevalidatePaths } from "@/lib/data/reporting-urls";
import { db } from "@/lib/db";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const createCountryReportProjectContributionAction = createMutationAction({
	schema: CreateCountryReportProjectContributionActionInputSchema,
	requireAuth: true,
	audit: { action: "create", subjectType: "country_reports" },
	revalidate: countryReportRevalidatePaths,

	async preCheck({ input, ctx }) {
		const t = await getExtracted();
		await assertCan(ctx.user, "update", {
			type: "country_report",
			id: input.countryReportId,
		});
		await assertReportEditable(ctx.user, { type: "country_report", id: input.countryReportId });

		// Don't trust the submitted document id: the FK only references `entities`, so verify it is a
		// project before attaching a contribution to it. Draft-only projects are allowed, so a
		// coordinator can report a project they created before an administrator publishes it.
		if (!(await isCountryReportProjectOption(input.projectDocumentId))) {
			return createActionStateError({
				message: t("Select a project."),
				validationErrors: { projectDocumentId: [t("Select a project.")] },
			});
		}

		const existing = await db.query.countryReportProjectContributions.findFirst({
			where: {
				countryReportId: input.countryReportId,
				projectDocumentId: input.projectDocumentId,
			},
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({
				message: t("A contribution for this project already exists."),
				validationErrors: {
					projectDocumentId: [t("A contribution for this project already exists.")],
				},
			});
		}

		return undefined;
	},

	async mutate(tx, input) {
		const t = await getExtracted();

		await tx.insert(schema.countryReportProjectContributions).values({
			countryReportId: input.countryReportId,
			projectDocumentId: input.projectDocumentId,
			amountEuros: input.amountEuros,
		});

		return { subjectId: input.countryReportId, successMessage: t("Added.") };
	},
});
