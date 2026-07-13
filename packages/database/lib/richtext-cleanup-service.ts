import type { JSONContent } from "@tiptap/core";
import { eq } from "drizzle-orm";

import type { Database, Transaction } from "./index";
import { normalizeRichTextDocument } from "./rich-text-normalize";
import * as schema from "./schema";

/**
 * Detects and rewrites rich-text content that {@link normalizeRichTextDocument} would tidy (empty
 * spacer paragraphs, stray `<br>`/whitespace, `&nbsp;`, imported HTML attributes, bold headings).
 * Covers both `rich_text` content blocks and the rich text inside `accordion` items. Shared by the
 * `@dariah-eric/maintenance` cli and the admin dashboard, so both normalise identically.
 */

/** JSON-serializable so findings can cross a server/client boundary. */
export interface RichTextCleanupBlock {
	contentBlockId: string;
	blockType: "rich_text" | "accordion";
	entityId: string;
	entityType: string;
	entityLabel: string | null;
	entitySlug: string;
	fieldName: string;
	/** Lifecycle status of the owning entity version (e.g. `draft`, `published`). */
	status: string;
	position: number;
}

export interface RichTextCleanupResult {
	blocks: Array<RichTextCleanupBlock>;
	total: number;
}

/** Deterministic serialisation (sorted keys) so `jsonb` key reordering is not seen as a change. */
function stableStringify(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(",")}]`;
	}
	if (value !== null && typeof value === "object") {
		return `{${Object.keys(value)
			.toSorted()
			.map(
				(key) =>
					`${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
			)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

interface AccordionItem {
	title: string;
	content: JSONContent;
}

/** One content block, with the normalised value it would be rewritten to and whether that differs. */
interface BlockCleanup {
	block: RichTextCleanupBlock;
	changed: boolean;
	/** For `rich_text` blocks: the normalised document to write. */
	richText?: JSONContent;
	/** For `accordion` blocks: the normalised items to write. */
	items?: Array<AccordionItem>;
}

async function computeCleanups(db: Database | Transaction): Promise<Array<BlockCleanup>> {
	const rows = await db
		.select({
			contentBlockId: schema.contentBlocks.id,
			position: schema.contentBlocks.position,
			richTextContent: schema.richTextContentBlocks.content,
			accordionItems: schema.accordionContentBlocks.items,
			entityId: schema.entities.id,
			entityLabel: schema.entities.label,
			entitySlug: schema.entities.slug,
			entityType: schema.entityTypes.type,
			fieldName: schema.entityTypesFieldsNames.fieldName,
			status: schema.entityStatus.type,
		})
		.from(schema.contentBlocks)
		.innerJoin(schema.fields, eq(schema.fields.id, schema.contentBlocks.fieldId))
		.innerJoin(
			schema.entityTypesFieldsNames,
			eq(schema.entityTypesFieldsNames.id, schema.fields.fieldNameId),
		)
		.innerJoin(schema.entityVersions, eq(schema.entityVersions.id, schema.fields.entityVersionId))
		.innerJoin(schema.entities, eq(schema.entities.id, schema.entityVersions.entityId))
		.innerJoin(schema.entityTypes, eq(schema.entityTypes.id, schema.entities.typeId))
		.innerJoin(schema.entityStatus, eq(schema.entityStatus.id, schema.entityVersions.statusId))
		.leftJoin(
			schema.richTextContentBlocks,
			eq(schema.richTextContentBlocks.id, schema.contentBlocks.id),
		)
		.leftJoin(
			schema.accordionContentBlocks,
			eq(schema.accordionContentBlocks.id, schema.contentBlocks.id),
		);

	const cleanups: Array<BlockCleanup> = [];

	for (const row of rows) {
		const base = {
			contentBlockId: row.contentBlockId,
			entityId: row.entityId,
			entityType: row.entityType,
			entityLabel: row.entityLabel,
			entitySlug: row.entitySlug,
			fieldName: row.fieldName,
			status: row.status,
			position: row.position,
		};

		if (row.richTextContent != null) {
			const normalized = normalizeRichTextDocument(row.richTextContent);
			cleanups.push({
				block: { ...base, blockType: "rich_text" },
				changed: stableStringify(normalized) !== stableStringify(row.richTextContent),
				richText: normalized,
			});
		} else if (row.accordionItems != null) {
			const items = row.accordionItems as Array<AccordionItem>;
			const normalizedItems = items.map((item) => {
				return { ...item, content: normalizeRichTextDocument(item.content) };
			});
			cleanups.push({
				block: { ...base, blockType: "accordion" },
				changed: items.some(
					(item, index) =>
						stableStringify(item.content) !== stableStringify(normalizedItems[index]!.content),
				),
				items: normalizedItems,
			});
		}
	}

	return cleanups;
}

export async function findRichTextNeedingCleanup(
	db: Database | Transaction,
): Promise<RichTextCleanupResult> {
	const cleanups = await computeCleanups(db);

	const blocks = cleanups
		.filter((cleanup) => cleanup.changed)
		.map((cleanup) => cleanup.block)
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

export interface CleanRichTextOptions {
	/** Recorded as the actor of the `update` audit events; `null` for system/cli runs. */
	actorUserId?: string | null;
}

export interface CleanRichTextResult {
	cleanedCount: number;
	/** Ids requested but not rewritten because they no longer need cleanup or no longer exist. */
	skippedIds: Array<string>;
}

/**
 * Rewrites the given content blocks with their normalised rich text, but only those which _still_
 * need cleanup at call time — recomputed here rather than trusting the caller's ids, so a block
 * edited in the meantime is not clobbered. Writes one `update` audit event per rewritten block.
 */
export async function cleanRichText(
	db: Database | Transaction,
	ids: Array<string>,
	options: CleanRichTextOptions = {},
): Promise<CleanRichTextResult> {
	const { actorUserId = null } = options;

	const requested = new Set(ids);
	const cleanups = await computeCleanups(db);
	const applicable = cleanups.filter(
		(cleanup) => cleanup.changed && requested.has(cleanup.block.contentBlockId),
	);
	const applicableIds = new Set(applicable.map((cleanup) => cleanup.block.contentBlockId));
	const skippedIds = ids.filter((id) => !applicableIds.has(id));

	if (applicable.length === 0) {
		return { cleanedCount: 0, skippedIds };
	}

	await db.transaction(async (tx) => {
		for (const cleanup of applicable) {
			if (cleanup.block.blockType === "rich_text") {
				await tx
					.update(schema.richTextContentBlocks)
					.set({ content: cleanup.richText! })
					.where(eq(schema.richTextContentBlocks.id, cleanup.block.contentBlockId));
			} else {
				await tx
					.update(schema.accordionContentBlocks)
					.set({ items: cleanup.items! })
					.where(eq(schema.accordionContentBlocks.id, cleanup.block.contentBlockId));
			}
		}

		await tx.insert(schema.auditLogs).values(
			applicable.map((cleanup) => {
				return {
					action: "update" as const,
					actorUserId,
					subjectType: "content_block",
					subjectId: cleanup.block.contentBlockId,
					summary: {
						cleanup: "normalize_rich_text",
						blockType: cleanup.block.blockType,
						entityId: cleanup.block.entityId,
						entityType: cleanup.block.entityType,
						fieldName: cleanup.block.fieldName,
						status: cleanup.block.status,
					},
				};
			}),
		);
	});

	return { cleanedCount: applicable.length, skippedIds };
}
