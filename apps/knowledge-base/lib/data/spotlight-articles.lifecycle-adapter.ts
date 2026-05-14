import * as schema from "@dariah-eric/database/schema";

import type { EntityLifecycleAdapter } from "@/lib/data/entity-lifecycle";
import { eq } from "@/lib/db/sql";

export const spotlightArticlesLifecycleAdapter: EntityLifecycleAdapter = {
	async cloneSubtype(tx, sourceVersionId, targetVersionId) {
		const [source] = await tx
			.select({
				title: schema.spotlightArticles.title,
				summary: schema.spotlightArticles.summary,
				imageId: schema.spotlightArticles.imageId,
			})
			.from(schema.spotlightArticles)
			.where(eq(schema.spotlightArticles.id, sourceVersionId))
			.limit(1);
		if (source == null) {return;}
		await tx.insert(schema.spotlightArticles).values({ id: targetVersionId, ...source });

		const contributors = await tx
			.select({
				personId: schema.spotlightArticlesToPersons.personId,
				role: schema.spotlightArticlesToPersons.role,
			})
			.from(schema.spotlightArticlesToPersons)
			.where(eq(schema.spotlightArticlesToPersons.spotlightArticleId, sourceVersionId));

		if (contributors.length > 0) {
			await tx.insert(schema.spotlightArticlesToPersons).values(
				contributors.map((c) => {
					return { spotlightArticleId: targetVersionId, ...c };
				}),
			);
		}
	},

	async wipeSubtype(tx, versionId) {
		await tx
			.delete(schema.spotlightArticlesToPersons)
			.where(eq(schema.spotlightArticlesToPersons.spotlightArticleId, versionId));
		await tx.delete(schema.spotlightArticles).where(eq(schema.spotlightArticles.id, versionId));
	},
};
