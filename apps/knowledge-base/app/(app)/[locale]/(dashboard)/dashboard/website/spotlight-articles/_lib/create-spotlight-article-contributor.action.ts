"use server";

import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";

import { CreateSpotlightArticleContributorActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_lib/create-spotlight-article-contributor.schema";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const createSpotlightArticleContributorAction = createMutationAction({
	schema: CreateSpotlightArticleContributorActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "spotlight_articles" },
	revalidate: "/[locale]/dashboard/website/spotlight-articles",

	async preCheck({ input }) {
		const t = await getExtracted();
		const existing = await db.query.spotlightArticlesToPersons.findFirst({
			where: { spotlightArticleId: input.articleId, personId: input.personId },
			columns: { personId: true },
		});

		if (existing != null) {
			return createActionStateError({ message: t("This contributor already exists.") });
		}

		return undefined;
	},

	async mutate(tx, input) {
		await tx.insert(schema.spotlightArticlesToPersons).values({
			spotlightArticleId: input.articleId,
			personId: input.personId,
			role: input.role,
		});

		await touchVersion(tx, input.articleId);

		return { subjectId: input.articleId };
	},
});
