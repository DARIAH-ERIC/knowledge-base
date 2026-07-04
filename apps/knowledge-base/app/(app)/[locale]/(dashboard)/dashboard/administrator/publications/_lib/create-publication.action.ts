"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import { toPublicationValues } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/publications/_lib/publication-input";
import { CreatePublicationActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/publications/_lib/publication.schema";
import { assertPublicationOrganisationalUnits } from "@/lib/data/publications";
import { syncPublicationSearchDocument } from "@/lib/search/publication-index";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const createPublicationAction = createMutationAction({
	schema: CreatePublicationActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "publication" },
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
		const [created] = await tx
			.insert(schema.publications)
			.values(toPublicationValues(input))
			.returning({ id: schema.publications.id });
		assert(created);
		if (documentIds.length > 0) {
			await tx.insert(schema.publicationsToOrganisationalUnits).values(
				documentIds.map((organisationalUnitDocumentId) => {
					return { publicationId: created.id, organisationalUnitDocumentId };
				}),
			);
		}
		return { subjectId: created.id };
	},
});
