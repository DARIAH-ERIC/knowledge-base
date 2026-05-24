"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import slugify from "@sindresorhus/slugify";

import { CreateCountryActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_lib/create-country.schema";
import { createDraftDocument, publishVersion } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { shouldSaveAndPublish } from "@/lib/form-intent";
import { createMutationAction } from "@/lib/server/create-mutation-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createCountryAction = createMutationAction({
	schema: CreateCountryActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "countries" },
	revalidate: "/[locale]/dashboard/administrator/countries",
	redirect: "/dashboard/administrator/countries",

	async mutate(tx, input, { formData }) {
		const slug = slugify(input.name);

		const entityType = await tx.query.entityTypes.findFirst({
			where: { type: "organisational_units" },
			columns: { id: true },
		});
		assert(entityType);

		const orgUnitType = await tx.query.organisationalUnitTypes.findFirst({
			where: { type: "country" },
			columns: { id: true },
		});
		assert(orgUnitType);

		const { documentId, versionId } = await createDraftDocument(tx, entityType.id, slug);

		let imageId: string | null = null;
		if (input.imageKey != null) {
			const asset = await tx.query.assets.findFirst({
				where: { key: input.imageKey },
				columns: { id: true },
			});
			assert(asset);
			imageId = asset.id;
		}

		await tx.insert(schema.organisationalUnits).values({
			id: versionId,
			acronym: input.acronym,
			imageId,
			name: input.name,
			summary: input.summary,
			typeId: orgUnitType.id,
		});

		if (input.relatedEntityIds.length > 0) {
			await tx.insert(schema.entitiesToEntities).values(
				input.relatedEntityIds.map((relatedEntityId) => {
					return { entityId: documentId, relatedEntityId };
				}),
			);
		}

		if (input.relatedResourceIds.length > 0) {
			await tx.insert(schema.entitiesToResources).values(
				input.relatedResourceIds.map((resourceId) => {
					return { entityId: documentId, resourceId };
				}),
			);
		}

		const descriptionFieldName = await tx.query.entityTypesFieldsNames.findFirst({
			where: { entityTypeId: entityType.id, fieldName: "description" },
			columns: { id: true },
		});
		assert(descriptionFieldName);

		const [descriptionField] = await tx
			.insert(schema.fields)
			.values({ entityVersionId: versionId, fieldNameId: descriptionFieldName.id })
			.returning({ id: schema.fields.id });
		assert(descriptionField);

		const richTextType = await tx.query.contentBlockTypes.findFirst({
			where: { type: "rich_text" },
			columns: { id: true },
		});
		assert(richTextType);

		const [contentBlock] = await tx
			.insert(schema.contentBlocks)
			.values({ fieldId: descriptionField.id, typeId: richTextType.id, position: 0 })
			.returning({ id: schema.contentBlocks.id });
		assert(contentBlock);

		await tx.insert(schema.richTextContentBlocks).values({
			id: contentBlock.id,
			content: JSON.parse(input.description) as schema.RichTextContentBlock["content"],
		});

		if (shouldSaveAndPublish(formData)) {
			await publishVersion(tx, documentId, organisationalUnitsLifecycleAdapter);
		}

		return {
			subjectId: documentId,
			auditSummary: {
				lifecycle: shouldSaveAndPublish(formData) ? "published" : "draft",
			},
		};
	},

	async postCommit({ ctx }) {
		if (!shouldSaveAndPublish(ctx.formData)) {
			return;
		}
		await dispatchWebhook({ type: "members-partners" });
	},
});
