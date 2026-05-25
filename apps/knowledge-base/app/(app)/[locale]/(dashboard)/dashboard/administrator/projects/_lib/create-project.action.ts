"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import slugify from "@sindresorhus/slugify";

import { CreateProjectActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/create-project.schema";
import { createDraftDocument, publishVersion } from "@/lib/data/entity-lifecycle";
import { projectsLifecycleAdapter } from "@/lib/data/projects.lifecycle-adapter";
import { shouldSaveAndPublish } from "@/lib/form-intent";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createMutationAction } from "@/lib/server/create-mutation-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createProjectAction = createMutationAction({
	schema: CreateProjectActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "projects" },
	revalidate: "/[locale]/dashboard/administrator/projects",
	redirect: "/dashboard/administrator/projects",

	async mutate(tx, input, { formData }) {
		const slug = slugify(input.name);

		const type = await tx.query.entityTypes.findFirst({
			where: { type: "projects" },
			columns: { id: true },
		});
		assert(type);

		const { documentId, versionId } = await createDraftDocument(tx, type.id, slug);

		let imageId: string | null = null;
		if (input.imageKey != null) {
			const asset = await tx.query.assets.findFirst({
				where: { key: input.imageKey },
				columns: { id: true },
			});
			assert(asset);
			imageId = asset.id;
		}

		await tx.insert(schema.projects).values({
			id: versionId,
			acronym: input.acronym,
			call: input.call,
			duration: input.duration,
			funding: input.funding,
			imageId,
			name: input.name,
			scopeId: input.scopeId,
			summary: input.summary,
			topic: input.topic,
		});

		if (input.description != null) {
			const descriptionFieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: { entityTypeId: type.id, fieldName: "description" },
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
		}

		if (shouldSaveAndPublish(formData)) {
			await publishVersion(tx, documentId, projectsLifecycleAdapter);
		}

		return {
			subjectId: documentId,
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
		await dispatchWebhook({ type: "dariah-projects" });
	},
});
