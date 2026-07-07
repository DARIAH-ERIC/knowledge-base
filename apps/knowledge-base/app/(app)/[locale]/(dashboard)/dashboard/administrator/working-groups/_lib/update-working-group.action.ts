"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import { UpdateWorkingGroupActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/update-working-group.schema";
import { ensureDraftVersion, publishVersion, touchVersion } from "@/lib/data/entity-lifecycle";
import { replaceEntityVersionFieldContentBlocks } from "@/lib/data/entity-version-fields";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { syncEntityRelations } from "@/lib/data/relations";
import { syncOrganisationalUnitSocialMedia } from "@/lib/data/social-media-relations";
import { eq } from "@/lib/db/sql";
import { shouldSaveAndPublish } from "@/lib/form-intent";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createMutationAction } from "@/lib/server/create-mutation-action";
import { dispatchWebhook, organisationalUnitChangeEvent } from "@/lib/webhook/dispatch-webhook";

export const updateWorkingGroupAction = createMutationAction({
	schema: UpdateWorkingGroupActionInputSchema,
	requireAdmin: true,
	audit: { action: "update", subjectType: "working_groups" },
	revalidate: "/[locale]/dashboard/administrator/working-groups",
	redirect: "/dashboard/administrator/working-groups",

	async mutate(tx, input, { formData }) {
		const draftVersionId = await ensureDraftVersion(
			tx,
			input.documentId,
			organisationalUnitsLifecycleAdapter,
		);

		let imageId: string | null = null;
		if (input.imageKey != null) {
			const asset = await tx.query.assets.findFirst({
				where: { key: input.imageKey },
				columns: { id: true },
			});
			assert(asset);
			imageId = asset.id;
		}

		await tx
			.update(schema.organisationalUnits)
			.set({
				acronym: input.acronym,
				email: input.email,
				imageId,
				mailingList: input.mailingList,
				name: input.name,
				sshocMarketplaceActorId: input.sshocMarketplaceActorId,
				summary: input.summary,
			})
			.where(eq(schema.organisationalUnits.id, draftVersionId));

		await replaceEntityVersionFieldContentBlocks(
			tx,
			draftVersionId,
			"description",
			input.descriptionContentBlocks,
		);

		await syncOrganisationalUnitSocialMedia(tx, draftVersionId, input.socialMediaIds);

		await syncEntityRelations(
			tx,
			input.documentId,
			input.relatedEntityIds,
			input.relatedResourceIds,
		);
		await touchVersion(tx, draftVersionId);

		if (shouldSaveAndPublish(formData)) {
			await publishVersion(tx, input.documentId, organisationalUnitsLifecycleAdapter);
		}

		return {
			subjectId: input.documentId,
			auditSummary: {
				lifecycle: shouldSaveAndPublish(formData) ? "published" : "draft",
			},
		};
	},

	async postCommit({ result, ctx }) {
		if (!shouldSaveAndPublish(ctx.formData)) {
			return;
		}
		await syncWebsiteDocumentForEntity(result.subjectId);
		await dispatchWebhook({ events: [organisationalUnitChangeEvent("working_group")] });
	},
});
