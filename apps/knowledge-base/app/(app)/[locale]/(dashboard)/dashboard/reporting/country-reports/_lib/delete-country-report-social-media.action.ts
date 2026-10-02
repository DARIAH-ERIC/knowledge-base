"use server";

import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { assertCan, assertReportEditable } from "@/lib/auth/permissions";
import { countryReportRevalidatePaths } from "@/lib/data/reporting-urls";
import { and, eq } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";
import { UserFacingError } from "@/lib/user-facing-error";

const InputSchema = v.object({
	membershipId: v.pipe(v.string(), v.uuid()),
	countryReportId: v.pipe(v.string(), v.uuid()),
});

export const deleteCountryReportSocialMediaAction = createMutationAction({
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
		const { membershipId, countryReportId } = input;

		// Scope by both ids so a row can only be removed via the report it belongs to (the authz check is
		// on countryReportId, so matching the membership id alone would allow cross-report deletes).
		const membership = await tx.query.countryReportSocialMedia.findFirst({
			where: { id: membershipId, countryReportId },
			columns: { socialMediaId: true },
		});
		if (membership == null) {
			throw new UserFacingError("record-not-found");
		}

		// Remove the account's KPI values for this report along with the membership.
		await tx
			.delete(schema.countryReportSocialMediaKpis)
			.where(
				and(
					eq(schema.countryReportSocialMediaKpis.countryReportId, countryReportId),
					eq(schema.countryReportSocialMediaKpis.socialMediaId, membership.socialMediaId),
				),
			);

		await tx
			.delete(schema.countryReportSocialMedia)
			.where(
				and(
					eq(schema.countryReportSocialMedia.id, membershipId),
					eq(schema.countryReportSocialMedia.countryReportId, countryReportId),
				),
			);

		return { subjectId: countryReportId };
	},
});
