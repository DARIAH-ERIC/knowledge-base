"use server";

import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";
import * as v from "valibot";

import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const InputSchema = v.object({ id: v.pipe(v.string(), v.uuid()) });

export const closeReportingCampaignAction = createMutationAction({
	schema: InputSchema,
	requireAdmin: true,
	audit: { action: "close", subjectType: "reporting_campaigns" },
	revalidate: "/[locale]/dashboard/administrator/reporting-campaigns",
	redirect: ({ input }) => `/dashboard/administrator/reporting-campaigns/${input.id}/edit/settings`,

	async preCheck({ input }) {
		const campaign = await db.query.reportingCampaigns.findFirst({
			where: { id: input.id },
			columns: { status: true },
		});
		if (campaign?.status !== "open") {
			const t = await getExtracted();
			return createActionStateError({ message: t("Campaign cannot be closed.") });
		}
		return undefined;
	},

	async mutate(tx, input) {
		await tx
			.update(schema.reportingCampaigns)
			.set({ status: "closed" })
			.where(eq(schema.reportingCampaigns.id, input.id));

		return { subjectId: input.id };
	},
});
