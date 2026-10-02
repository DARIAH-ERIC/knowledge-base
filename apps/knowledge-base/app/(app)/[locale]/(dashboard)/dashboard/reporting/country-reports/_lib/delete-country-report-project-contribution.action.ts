"use server";

import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { assertCan, assertReportEditable } from "@/lib/auth/permissions";
import { countryReportRevalidatePaths } from "@/lib/data/reporting-urls";
import { and, eq } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const InputSchema = v.object({
	contributionId: v.pipe(v.string(), v.uuid()),
	countryReportId: v.pipe(v.string(), v.uuid()),
});

export const deleteCountryReportProjectContributionAction = createMutationAction({
	schema: InputSchema,
	requireAuth: true,
	audit: { action: "delete", subjectType: "country_reports" },
	revalidate: countryReportRevalidatePaths,

	async preCheck({ input, ctx }) {
		await assertCan(ctx.user, "update", { type: "country_report", id: input.countryReportId });
		await assertReportEditable(ctx.user, { type: "country_report", id: input.countryReportId });
		return undefined;
	},

	async mutate(tx, input) {
		const { contributionId, countryReportId } = input;

		// Scope by both ids so a row can only be removed via the report it belongs to (the authz check is
		// on countryReportId, so matching the contribution id alone would allow cross-report deletes).
		await tx
			.delete(schema.countryReportProjectContributions)
			.where(
				and(
					eq(schema.countryReportProjectContributions.id, contributionId),
					eq(schema.countryReportProjectContributions.countryReportId, countryReportId),
				),
			);

		return { subjectId: countryReportId };
	},
});
