import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import type { ContentBlockInput } from "@/lib/content-block-input";
import { type CreatedDocument, createDraftDocumentWithSlug } from "@/lib/data/entity-lifecycle";
import { replaceEntityVersionFieldContentBlocks } from "@/lib/data/entity-version-fields";
import { filterToPublishedDocumentIds } from "@/lib/data/relations";
import { syncOrganisationalUnitSocialMedia } from "@/lib/data/social-media-relations";
import type { Transaction } from "@/lib/db";

interface InstitutionDraftInput {
	requestedSlug: string | null;
	name: string;
	acronym?: string;
	ror?: string;
	summary?: string | null;
	sshocMarketplaceActorId: number | null;
	imageKey?: string;
	descriptionContentBlocks: Array<ContentBlockInput>;
	relatedEntityIds: Array<string>;
	relatedResourceIds: Array<string>;
	socialMediaIds: Array<string>;
}

/**
 * Creates a new institution as a draft document. Shared by the admin create form, which may publish
 * it right away, and the country dashboard, where publishing remains an admin task.
 */
export async function createInstitutionDraft(
	tx: Transaction,
	input: InstitutionDraftInput,
): Promise<CreatedDocument> {
	const entityType = await tx.query.entityTypes.findFirst({
		where: { type: "organisational_units" },
		columns: { id: true },
	});
	assert(entityType);

	const orgUnitType = await tx.query.organisationalUnitTypes.findFirst({
		where: { type: "institution" },
		columns: { id: true },
	});
	assert(orgUnitType);

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

	await tx.insert(schema.organisationalUnits).values({
		id: created.versionId,
		acronym: input.acronym,
		ror: input.ror,
		imageId,
		name: input.name,
		sshocMarketplaceActorId: input.sshocMarketplaceActorId,
		summary: input.summary,
		typeId: orgUnitType.id,
	});

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

	await syncOrganisationalUnitSocialMedia(tx, created.versionId, input.socialMediaIds);

	await replaceEntityVersionFieldContentBlocks(
		tx,
		created.versionId,
		"description",
		input.descriptionContentBlocks,
	);

	return created;
}
