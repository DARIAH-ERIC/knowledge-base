"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { getExtracted } from "next-intl/server";
import * as v from "valibot";

import { CreateInstitutionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/create-institution.schema";
import { assertCan } from "@/lib/auth/permissions";
import { createInstitutionDraft } from "@/lib/data/create-institution-draft";
import { checkSshocMarketplaceActorIdAvailable } from "@/lib/data/sshoc-marketplace-actor-id";
import { getRequestedSlug } from "@/lib/entity-slug-input";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const CreateDelegatedInstitutionActionInputSchema = v.object({
	// Related entities and resources are curated by admins, so the delegated form does not offer them.
	...v.omit(CreateInstitutionActionInputSchema, ["relatedEntityIds", "relatedResourceIds"]).entries,
	// The section posts the country document id as a generic hidden `scopeDocumentId` field.
	scopeDocumentId: v.pipe(v.string(), v.uuid()),
});

/**
 * Creates a new institution as a draft and locates it in the coordinator's country
 * (`is_located_in`), so it becomes selectable in the country-scoped institution picker. Takes the
 * fields of the admin create form except relations; publishing remains an admin task. Authorized
 * against the country the caller is editing.
 */
export const createDelegatedInstitutionAction = createMutationAction({
	schema: CreateDelegatedInstitutionActionInputSchema,
	requireAuth: true,
	audit: { action: "create", subjectType: "institutions" },
	revalidate: "/[locale]/dashboard/countries",
	async preCheck({ input, ctx }) {
		await assertCan(ctx.user, "update", {
			type: "organisational_unit",
			id: input.scopeDocumentId,
		});
		return checkSshocMarketplaceActorIdAvailable({
			sshocMarketplaceActorId: input.sshocMarketplaceActorId,
		});
	},
	async mutate(tx, input) {
		const t = await getExtracted();

		const { documentId } = await createInstitutionDraft(tx, {
			...input,
			requestedSlug: getRequestedSlug(input.slug),
			relatedEntityIds: [],
			relatedResourceIds: [],
		});

		const locatedInStatus = await tx.query.organisationalUnitStatus.findFirst({
			where: { status: "is_located_in" },
			columns: { id: true },
		});
		assert(locatedInStatus);

		await tx.insert(schema.organisationalUnitsRelations).values({
			unitDocumentId: documentId,
			relatedUnitDocumentId: input.scopeDocumentId,
			status: locatedInStatus.id,
			duration: { start: new Date() },
		});

		return {
			subjectId: documentId,
			auditSummary: { lifecycle: "draft" },
			successMessage: t("Institution saved as draft."),
			successData: { id: documentId, name: input.name },
		};
	},
});
