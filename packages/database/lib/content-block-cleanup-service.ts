import { eq, inArray } from "drizzle-orm";

import type { Database, Transaction } from "./index";
import { isEmptyRichTextDocument } from "./rich-text";
import * as schema from "./schema";

/**
 * Detects and removes semantically empty `rich_text` content blocks — blocks whose document has no
 * meaningful content (empty paragraphs, stray hard breaks, whitespace). Accordion items are
 * intentionally left alone. Shared by the `@dariah-eric/maintenance` cli and the admin dashboard,
 * so both use the exact same definition of "empty".
 */

/** JSON-serializable so findings can cross a server/client boundary. */
export interface EmptyContentBlock {
	contentBlockId: string;
	entityId: string;
	entityType: string;
	entityLabel: string | null;
	entitySlug: string;
	fieldName: string;
	/** Lifecycle status of the owning entity version (e.g. `draft`, `published`). */
	status: string;
	position: number;
}

export interface EmptyContentBlocksResult {
	blocks: Array<EmptyContentBlock>;
	total: number;
}

interface RichTextBlockRow extends EmptyContentBlock {
	content: (typeof schema.richTextContentBlocks.$inferSelect)["content"];
}

/** Every `rich_text` content block joined to its owning entity version and field, for review. */
async function getRichTextBlocks(db: Database | Transaction): Promise<Array<RichTextBlockRow>> {
	return db
		.select({
			contentBlockId: schema.contentBlocks.id,
			content: schema.richTextContentBlocks.content,
			position: schema.contentBlocks.position,
			entityId: schema.entities.id,
			entityLabel: schema.entities.label,
			entitySlug: schema.entities.slug,
			entityType: schema.entityTypes.type,
			fieldName: schema.entityTypesFieldsNames.fieldName,
			status: schema.entityStatus.type,
		})
		.from(schema.richTextContentBlocks)
		.innerJoin(schema.contentBlocks, eq(schema.contentBlocks.id, schema.richTextContentBlocks.id))
		.innerJoin(schema.fields, eq(schema.fields.id, schema.contentBlocks.fieldId))
		.innerJoin(
			schema.entityTypesFieldsNames,
			eq(schema.entityTypesFieldsNames.id, schema.fields.fieldNameId),
		)
		.innerJoin(schema.entityVersions, eq(schema.entityVersions.id, schema.fields.entityVersionId))
		.innerJoin(schema.entities, eq(schema.entities.id, schema.entityVersions.entityId))
		.innerJoin(schema.entityTypes, eq(schema.entityTypes.id, schema.entities.typeId))
		.innerJoin(schema.entityStatus, eq(schema.entityStatus.id, schema.entityVersions.statusId));
}

export async function findEmptyContentBlocks(
	db: Database | Transaction,
): Promise<EmptyContentBlocksResult> {
	const rows = await getRichTextBlocks(db);

	const blocks = rows
		.filter((row) => isEmptyRichTextDocument(row.content))
		.map(({ content: _content, ...block }): EmptyContentBlock => block)
		.toSorted(
			(a, b) =>
				a.entityType.localeCompare(b.entityType) ||
				(a.entityLabel ?? a.entitySlug).localeCompare(b.entityLabel ?? b.entitySlug) ||
				a.status.localeCompare(b.status) ||
				a.fieldName.localeCompare(b.fieldName) ||
				a.position - b.position ||
				a.contentBlockId.localeCompare(b.contentBlockId),
		);

	return { blocks, total: blocks.length };
}

export interface DeleteEmptyContentBlocksOptions {
	/** Recorded as the actor of the `delete` audit events; `null` for system/cli runs. */
	actorUserId?: string | null;
}

export interface DeleteEmptyContentBlocksResult {
	deletedCount: number;
	/** Ids requested but not deleted because they are no longer empty or no longer exist. */
	skippedIds: Array<string>;
}

/**
 * Deletes the given content blocks, but only those which are _still_ empty at call time — the empty
 * set is recomputed here rather than trusting the caller's ids, so a block edited to have content
 * in the meantime is protected. Deleting the `content_blocks` row cascades to its `rich_text` row.
 */
export async function deleteEmptyContentBlocks(
	db: Database | Transaction,
	ids: Array<string>,
	options: DeleteEmptyContentBlocksOptions = {},
): Promise<DeleteEmptyContentBlocksResult> {
	const { actorUserId = null } = options;

	const requested = new Set(ids);
	const { blocks } = await findEmptyContentBlocks(db);
	const deletable = blocks.filter((block) => requested.has(block.contentBlockId));
	const deletableIds = new Set(deletable.map((block) => block.contentBlockId));
	const skippedIds = ids.filter((id) => !deletableIds.has(id));

	if (deletable.length === 0) {
		return { deletedCount: 0, skippedIds };
	}

	await db.transaction(async (tx) => {
		await tx
			.delete(schema.contentBlocks)
			.where(inArray(schema.contentBlocks.id, [...deletableIds]));
		await tx.insert(schema.auditLogs).values(
			deletable.map((block) => {
				return {
					action: "delete" as const,
					actorUserId,
					subjectType: "content_block",
					subjectId: block.contentBlockId,
					summary: {
						entityId: block.entityId,
						entityType: block.entityType,
						fieldName: block.fieldName,
						status: block.status,
					},
				};
			}),
		);
	});

	return { deletedCount: deletable.length, skippedIds };
}
