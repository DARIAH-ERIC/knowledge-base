"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import { CreateDocumentOrPolicyActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/create-document-or-policy.schema";
import { resolveDocumentOrPolicyTarget } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/resolve-document-or-policy-target";
import { documentsPoliciesLifecycleAdapter } from "@/lib/data/documents-policies.lifecycle-adapter";
import { createDraftDocumentWithSlug, publishVersion } from "@/lib/data/entity-lifecycle";
import { ensureEntityVersionField, insertContentBlockTree } from "@/lib/data/entity-version-fields";
import { eq, isNull } from "@/lib/db/sql";
import { getRequestedSlug } from "@/lib/entity-slug-input";
import { shouldSaveAndPublish } from "@/lib/form-intent";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createMutationAction, getCreatedSlug } from "@/lib/server/create-mutation-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createDocumentOrPolicyAction = createMutationAction<
	typeof CreateDocumentOrPolicyActionInputSchema,
	{ documentId: string; published: boolean }
>({
	schema: CreateDocumentOrPolicyActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "documents_policies" },
	revalidate: "/[locale]/dashboard/website/documents-policies",
	redirect: ({ result }) =>
		`/dashboard/website/documents-policies/${getCreatedSlug(result)}/details`,

	async mutate(tx, input, { formData }) {
		const type = await tx.query.entityTypes.findFirst({
			where: { type: "documents_policies" },
			columns: { id: true },
		});

		assert(type);

		const { documentId, versionId, slug } = await createDraftDocumentWithSlug(tx, type.id, {
			requestedSlug: getRequestedSlug(input.slug),
			title: input.title,
		});

		const target = await resolveDocumentOrPolicyTarget(tx, input);

		const siblings = await tx
			.select({ id: schema.documentsPolicies.id })
			.from(schema.documentsPolicies)
			.where(
				input.groupId != null
					? eq(schema.documentsPolicies.groupId, input.groupId)
					: isNull(schema.documentsPolicies.groupId),
			);

		await tx.insert(schema.documentsPolicies).values({
			id: versionId,
			...target,
			title: input.title,
			summary: input.summary,
			groupId: input.groupId ?? null,
			position: siblings.length,
		});

		const contentField = await ensureEntityVersionField(tx, versionId, "description");

		await insertContentBlockTree(tx, contentField.id, input.contentBlocks);

		const published = shouldSaveAndPublish(formData);
		if (published) {
			await publishVersion(tx, documentId, documentsPoliciesLifecycleAdapter);
		}

		return {
			subjectId: documentId,
			subjectSlug: slug,
			auditSummary: { lifecycle: published ? "published" : "draft" },
			successData: { documentId, published },
		};
	},

	async postCommit({ result }) {
		if (result.successData == null || !result.successData.published) {
			return;
		}

		await syncWebsiteDocumentForEntity(result.successData.documentId);
		await dispatchWebhook({ tags: ["documents-policies"] });
	},
});
