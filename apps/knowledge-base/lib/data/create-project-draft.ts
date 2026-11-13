import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import type { ContentBlockInput } from "@/lib/content-block-input";
import { type CreatedDocument, createDraftDocumentWithSlug } from "@/lib/data/entity-lifecycle";
import { replaceEntityVersionFieldContentBlocks } from "@/lib/data/entity-version-fields";
import { filterToPublishedDocumentIds } from "@/lib/data/relations";
import { syncProjectSocialMedia } from "@/lib/data/social-media-relations";
import type { Transaction } from "@/lib/db";

interface ProjectDraftInput extends Pick<
	typeof schema.projects.$inferInsert,
	"acronym" | "call" | "funding" | "name" | "scopeId" | "summary" | "topic"
> {
	requestedSlug: string | null;
	duration: { start: Date; end?: Date };
	imageKey?: string;
	descriptionContentBlocks: Array<ContentBlockInput>;
	relatedEntityIds: Array<string>;
	relatedResourceIds: Array<string>;
	socialMediaIds: Array<string>;
}

/**
 * Creates a new project as a draft document. Shared by the admin create form, which may publish it
 * right away, and the country report projects step, where publishing remains an admin task.
 */
export async function createProjectDraft(
	tx: Transaction,
	input: ProjectDraftInput,
): Promise<CreatedDocument> {
	const entityType = await tx.query.entityTypes.findFirst({
		where: { type: "projects" },
		columns: { id: true },
	});
	assert(entityType);

	const created = await createDraftDocumentWithSlug(tx, entityType.id, {
		requestedSlug: input.requestedSlug,
		title: input.name,
	});

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
		id: created.versionId,
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

	await replaceEntityVersionFieldContentBlocks(
		tx,
		created.versionId,
		"description",
		input.descriptionContentBlocks,
	);

	const publishedRelatedEntityIds = await filterToPublishedDocumentIds(tx, input.relatedEntityIds);
	if (publishedRelatedEntityIds.length > 0) {
		await tx.insert(schema.entitiesToEntities).values(
			publishedRelatedEntityIds.map((relatedEntityId, position) => {
				return { entityId: created.documentId, position, relatedEntityId };
			}),
		);
	}

	if (input.relatedResourceIds.length > 0) {
		await tx.insert(schema.entitiesToResources).values(
			input.relatedResourceIds.map((resourceId, position) => {
				return { entityId: created.documentId, position, resourceId };
			}),
		);
	}

	await syncProjectSocialMedia(tx, created.versionId, input.socialMediaIds);

	return created;
}
