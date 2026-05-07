import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import type { Transaction } from "@/lib/db";
import { eq, inArray, or } from "@/lib/db/sql";

export interface DocumentVersion {
	documentId: string;
	versionId: string;
}

/**
 * Insert a new entity-backed document with a single published version row.
 *
 * Subtype rows should then be inserted with `id: versionId` (subtype tables
 * key off entity_versions). Cross-document relation rows should reference
 * `documentId`.
 */
export async function createPublishedDocument(
	tx: Transaction,
	typeId: string,
	slug: string,
): Promise<DocumentVersion> {
	const status = await tx.query.entityStatus.findFirst({
		where: { type: "published" },
		columns: { id: true },
	});
	assert(status);

	const [document] = await tx
		.insert(schema.entities)
		.values({ slug, typeId })
		.returning({ id: schema.entities.id });
	assert(document);

	const [version] = await tx
		.insert(schema.entityVersions)
		.values({ entityId: document.id, statusId: status.id })
		.returning({ id: schema.entityVersions.id });
	assert(version);

	return { documentId: document.id, versionId: version.id };
}

/** Look up the owning documentId (= entities.id) for a given entity_version row. */
export async function getDocumentIdForVersion(tx: Transaction, versionId: string): Promise<string> {
	const v = await tx.query.entityVersions.findFirst({
		where: { id: versionId },
		columns: { entityId: true },
	});
	assert(v);
	return v.entityId;
}

/**
 * Delete the generic tail of a document: fields and content blocks under
 * `versionId`, cross-document relations, the version row, and the document
 * row itself.
 *
 * The subtype row must be deleted by the caller before calling this — each
 * subtype lives in a different table, and this helper does not know which.
 */
export async function deleteDocumentVersionTail(
	tx: Transaction,
	versionId: string,
	documentId: string,
): Promise<void> {
	const fieldsRows = await tx
		.select({ id: schema.fields.id })
		.from(schema.fields)
		.where(eq(schema.fields.entityVersionId, versionId));

	if (fieldsRows.length > 0) {
		const fieldIds = fieldsRows.map((f) => {
			return f.id;
		});

		await tx.delete(schema.contentBlocks).where(inArray(schema.contentBlocks.fieldId, fieldIds));
		await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
	}

	await tx
		.delete(schema.entitiesToResources)
		.where(eq(schema.entitiesToResources.entityId, documentId));

	await tx
		.delete(schema.entitiesToEntities)
		.where(
			or(
				eq(schema.entitiesToEntities.entityId, documentId),
				eq(schema.entitiesToEntities.relatedEntityId, documentId),
			),
		);

	await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, versionId));
	await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));
}
