"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import { toPublicationValues } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/publications/_lib/publication-input";
import { UpdatePublicationActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/publications/_lib/publication.schema";
import { assertPublicationOrganisationalUnits } from "@/lib/data/publications";
import { eq } from "@/lib/db/sql";
import { syncPublicationSearchDocument } from "@/lib/search/publication-index";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const updatePublicationAction = createMutationAction({
	schema: UpdatePublicationActionInputSchema,
	requireAdmin: true,
	audit: { action: "update", subjectType: "publication" },
	revalidate: "/[locale]/dashboard/administrator/publications",
	redirect: "/dashboard/administrator/publications",
	postCommit: async ({ result }) => {
		await syncPublicationSearchDocument(result.subjectId);
	},

	async mutate(tx, input) {
		const documentIds = [
			...new Set([...input.nationalConsortiumDocumentIds, ...input.workingGroupDocumentIds]),
		];
		await assertPublicationOrganisationalUnits(tx, documentIds);
		const [updated] = await tx
			.update(schema.publications)
			.set(toPublicationValues(input))
			.where(eq(schema.publications.id, input.id))
			.returning({ id: schema.publications.id });
		assert(updated, "Publication not found.");
		await tx
			.delete(schema.publicationsToOrganisationalUnits)
			.where(eq(schema.publicationsToOrganisationalUnits.publicationId, input.id));
		if (documentIds.length > 0) {
			await tx.insert(schema.publicationsToOrganisationalUnits).values(
				documentIds.map((organisationalUnitDocumentId) => {
					return { publicationId: input.id, organisationalUnitDocumentId };
				}),
			);
		}
		return { subjectId: input.id };
	},
});
