"use server";

import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";

import { CreateImpactCaseStudyContributorActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_lib/create-impact-case-study-contributor.schema";
import { isPublishedEntityVersions } from "@/lib/data/current-entity-version";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const createImpactCaseStudyContributorAction = createMutationAction({
	schema: CreateImpactCaseStudyContributorActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "impact_case_studies" },
	revalidate: "/[locale]/dashboard/website/impact-case-studies",

	async preCheck({ input }) {
		const t = await getExtracted();

		if (!(await isPublishedEntityVersions(db, [input.personId]))) {
			return createActionStateError({
				message: t("Relations can only target published entities."),
			});
		}

		const existing = await db.query.impactCaseStudiesToPersons.findFirst({
			where: { impactCaseStudyId: input.articleId, personId: input.personId },
			columns: { personId: true },
		});

		if (existing != null) {
			return createActionStateError({ message: t("This contributor already exists.") });
		}

		return undefined;
	},

	async mutate(tx, input) {
		await tx.insert(schema.impactCaseStudiesToPersons).values({
			impactCaseStudyId: input.articleId,
			personId: input.personId,
			role: input.role,
		});

		await touchVersion(tx, input.articleId);

		return { subjectId: input.articleId };
	},
});
