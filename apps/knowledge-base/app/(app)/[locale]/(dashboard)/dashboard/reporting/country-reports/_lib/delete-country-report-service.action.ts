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

export const deleteCountryReportServiceAction = createMutationAction({
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

		const membership = await tx.query.countryReportServices.findFirst({
			where: { id: membershipId, countryReportId },
			columns: { serviceId: true },
		});
		if (membership == null) {
			throw new UserFacingError("record-not-found");
		}

		await tx
			.delete(schema.countryReportServiceKpis)
			.where(
				and(
					eq(schema.countryReportServiceKpis.countryReportId, countryReportId),
					eq(schema.countryReportServiceKpis.serviceId, membership.serviceId),
				),
			);

		await tx
			.delete(schema.countryReportServices)
			.where(
				and(
					eq(schema.countryReportServices.id, membershipId),
					eq(schema.countryReportServices.countryReportId, countryReportId),
				),
			);

		return { subjectId: countryReportId };
	},
});
