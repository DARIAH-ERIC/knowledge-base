import * as schema from "@dariah-eric/database/schema";

import type { EntityLifecycleAdapter } from "@/lib/data/entity-lifecycle";
import { eq } from "@/lib/db/sql";

export const impactCaseStudiesLifecycleAdapter: EntityLifecycleAdapter = {
	async cloneSubtype(tx, sourceVersionId, targetVersionId) {
		const [source] = await tx
			.select({
				title: schema.impactCaseStudies.title,
				summary: schema.impactCaseStudies.summary,
				imageId: schema.impactCaseStudies.imageId,
			})
			.from(schema.impactCaseStudies)
			.where(eq(schema.impactCaseStudies.id, sourceVersionId))
			.limit(1);
		if (source == null) {return;}
		await tx.insert(schema.impactCaseStudies).values({ id: targetVersionId, ...source });

		const contributors = await tx
			.select({
				personId: schema.impactCaseStudiesToPersons.personId,
				role: schema.impactCaseStudiesToPersons.role,
			})
			.from(schema.impactCaseStudiesToPersons)
			.where(eq(schema.impactCaseStudiesToPersons.impactCaseStudyId, sourceVersionId));

		if (contributors.length > 0) {
			await tx.insert(schema.impactCaseStudiesToPersons).values(
				contributors.map((c) => {
					return { impactCaseStudyId: targetVersionId, ...c };
				}),
			);
		}
	},

	async wipeSubtype(tx, versionId) {
		await tx
			.delete(schema.impactCaseStudiesToPersons)
			.where(eq(schema.impactCaseStudiesToPersons.impactCaseStudyId, versionId));
		await tx.delete(schema.impactCaseStudies).where(eq(schema.impactCaseStudies.id, versionId));
	},
};
