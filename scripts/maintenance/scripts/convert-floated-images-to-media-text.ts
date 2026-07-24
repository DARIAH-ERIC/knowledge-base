import * as readline from "node:readline/promises";

import { assert, log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { and, eq, gt, inArray, sql } from "@dariah-eric/database/sql";

import { env } from "../config/env.config";

/**
 * Promotes a _presentational_ floated `image` block into a _semantic_ `media_text` block for the
 * named news items — the opt-in, human-vetted counterpart to `backfill-image-alignment`. Use it
 * where the image and the text beside it genuinely belong together (a portrait next to a bio, a
 * logo next to a working-group blurb) rather than the image merely being floated for size.
 *
 * Slugs are passed as positional arguments. By default it prompts once per floated image (showing
 * the text beside it), so within one item the first image can stay floated and the next convert;
 * `--all` converts every pair without prompting, and `--dry-run` only lists them.
 *
 * @example
 * 	pnpm run data:convert:floated-images-to-media-text -- some-news-slug another-news-slug
 * 	pnpm run data:convert:floated-images-to-media-text -- --dry-run some-news-slug
 * 	pnpm run data:convert:floated-images-to-media-text -- --all some-news-slug
 *
 * 	Operates on the database alone (no WordPress round-trip): within each named item's `content`
 * 	field it finds every `image` block whose `layout` is `float-start`/`float-end` and whose *next*
 * 	block is `rich_text`, and collapses each confirmed pair into one `media_text` block — reusing the
 * 	image block's row (only its type and subtype row change), deleting the `rich_text` block, and
 * 	closing the position gap. The `media_text` `side` is taken from the float (`float-start` →
 * 	`start`, `float-end` → `end`). A floated image not followed by `rich_text` is left as an `image`.
 */

const db = createDatabaseService({
	connection: {
		database: env.DATABASE_NAME,
		host: env.DATABASE_HOST,
		password: env.DATABASE_PASSWORD,
		port: env.DATABASE_PORT,
		user: env.DATABASE_USER,
	},
	logger: false,
}).unwrap();

/** Minimal shape of a TipTap document node — just what the preview traversal reads. */
interface RichTextNode {
	text?: string;
	content?: Array<RichTextNode>;
}

interface EntityBlock {
	blockId: string;
	fieldId: string;
	blockType: string;
	position: number;
	imageLayout: (typeof schema.imageLayoutEnum)[number] | null;
	richTextContent: RichTextNode | null;
}

/** Flattens a TipTap document's text nodes into a single string, for a decision-aiding preview. */
function extractPlainText(content: RichTextNode | null): string {
	if (content == null) {
		return "";
	}
	const parts: Array<string> = [];
	const visit = (node: RichTextNode): void => {
		if (typeof node.text === "string") {
			parts.push(node.text);
		}
		for (const child of node.content ?? []) {
			visit(child);
		}
	};
	visit(content);
	return parts.join(" ").replaceAll(/\s+/g, " ").trim();
}

function truncate(text: string, max = 160): string {
	return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** Published `news` entities' `content` blocks, ordered by position, for the given slugs only. */
async function findNewsEntityBlocks(
	slugs: Array<string>,
): Promise<Map<string, { documentId: string; blocks: Array<EntityBlock> }>> {
	const rows = await db
		.select({
			documentId: schema.entities.id,
			slug: schema.entities.slug,
			blockId: schema.contentBlocks.id,
			fieldId: schema.contentBlocks.fieldId,
			blockType: schema.contentBlockTypes.type,
			position: schema.contentBlocks.position,
			imageLayout: schema.imageContentBlocks.layout,
			richTextContent: schema.richTextContentBlocks.content,
		})
		.from(schema.entities)
		.innerJoin(schema.entityTypes, eq(schema.entities.typeId, schema.entityTypes.id))
		.innerJoin(schema.entityVersions, eq(schema.entityVersions.entityId, schema.entities.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.innerJoin(schema.fields, eq(schema.fields.entityVersionId, schema.entityVersions.id))
		.innerJoin(
			schema.entityTypesFieldsNames,
			eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
		)
		.innerJoin(schema.contentBlocks, eq(schema.contentBlocks.fieldId, schema.fields.id))
		.innerJoin(
			schema.contentBlockTypes,
			eq(schema.contentBlocks.typeId, schema.contentBlockTypes.id),
		)
		.leftJoin(schema.imageContentBlocks, eq(schema.imageContentBlocks.id, schema.contentBlocks.id))
		.leftJoin(
			schema.richTextContentBlocks,
			eq(schema.richTextContentBlocks.id, schema.contentBlocks.id),
		)
		.where(
			and(
				eq(schema.entityTypes.type, "news"),
				eq(schema.entityStatus.type, "published"),
				eq(schema.entityTypesFieldsNames.fieldName, "content"),
				inArray(schema.entities.slug, slugs),
			),
		)
		.orderBy(schema.entities.slug, schema.contentBlocks.position);

	const bySlug = new Map<string, { documentId: string; blocks: Array<EntityBlock> }>();

	for (const row of rows) {
		if (!bySlug.has(row.slug)) {
			bySlug.set(row.slug, { documentId: row.documentId, blocks: [] });
		}
		bySlug.get(row.slug)!.blocks.push({
			blockId: row.blockId,
			fieldId: row.fieldId,
			blockType: row.blockType,
			position: row.position,
			imageLayout: row.imageLayout,
			richTextContent: row.richTextContent,
		});
	}

	return bySlug;
}

interface Pair {
	entitySlug: string;
	side: (typeof schema.mediaTextSideEnum)[number];
	fieldId: string;
	imageContentBlockId: string;
	imagePosition: number;
	richTextContentBlockId: string;
	/** Plain-text preview of the wrapping rich_text, to decide whether the pairing is semantic. */
	preview: string;
}

function findPairs(
	slugs: Array<string>,
	entitiesBySlug: Map<string, { documentId: string; blocks: Array<EntityBlock> }>,
): Array<Pair> {
	const pairs: Array<Pair> = [];

	for (const slug of slugs) {
		const entity = entitiesBySlug.get(slug);
		if (entity == null) {
			log.warn(`No published news item with a \`content\` field for slug \`${slug}\`.`);
			continue;
		}

		const blocksByPosition = new Map(entity.blocks.map((block) => [block.position, block]));

		for (const block of entity.blocks) {
			if (
				block.blockType !== "image" ||
				(block.imageLayout !== "float-start" && block.imageLayout !== "float-end")
			) {
				continue;
			}

			const nextBlock = blocksByPosition.get(block.position + 1);
			if (nextBlock?.blockType !== "rich_text") {
				log.warn(`Skipping a floated image in \`${slug}\`: not followed by a \`rich_text\` block.`);
				continue;
			}

			pairs.push({
				entitySlug: slug,
				side: block.imageLayout === "float-end" ? "end" : "start",
				fieldId: block.fieldId,
				imageContentBlockId: block.blockId,
				imagePosition: block.position,
				richTextContentBlockId: nextBlock.blockId,
				preview: truncate(extractPlainText(nextBlock.richTextContent)),
			});
		}
	}

	return pairs;
}

/**
 * Collapses each pair inside its own transaction, re-reading both blocks first so a pairing that
 * changed since it was found (an editor touched the item, or a previous run already applied it) is
 * skipped rather than forced.
 */
async function applyPairs(pairs: Array<Pair>): Promise<number> {
	const [mediaTextType] = await db
		.select({ id: schema.contentBlockTypes.id })
		.from(schema.contentBlockTypes)
		.where(eq(schema.contentBlockTypes.type, "media_text"))
		.limit(1);
	assert(mediaTextType, "Missing `media_text` content block type.");

	let applied = 0;

	for (const pair of pairs) {
		await db.transaction(async (tx) => {
			const [imageBlock] = await tx
				.select({
					id: schema.contentBlocks.id,
					fieldId: schema.contentBlocks.fieldId,
					position: schema.contentBlocks.position,
					imageId: schema.imageContentBlocks.imageId,
				})
				.from(schema.contentBlocks)
				.innerJoin(
					schema.imageContentBlocks,
					eq(schema.imageContentBlocks.id, schema.contentBlocks.id),
				)
				.where(eq(schema.contentBlocks.id, pair.imageContentBlockId))
				.limit(1);

			const [richTextBlock] = await tx
				.select({
					id: schema.contentBlocks.id,
					fieldId: schema.contentBlocks.fieldId,
					position: schema.contentBlocks.position,
					content: schema.richTextContentBlocks.content,
				})
				.from(schema.contentBlocks)
				.innerJoin(
					schema.richTextContentBlocks,
					eq(schema.richTextContentBlocks.id, schema.contentBlocks.id),
				)
				.where(eq(schema.contentBlocks.id, pair.richTextContentBlockId))
				.limit(1);

			if (imageBlock == null || richTextBlock == null) {
				log.warn(`Skipping ${pair.entitySlug}: block no longer exists.`);
				return;
			}

			if (
				richTextBlock.fieldId !== imageBlock.fieldId ||
				richTextBlock.position !== imageBlock.position + 1
			) {
				log.warn(
					`Skipping ${pair.entitySlug}: no longer adjacent — item was edited since it was found.`,
				);
				return;
			}

			await tx
				.delete(schema.imageContentBlocks)
				.where(eq(schema.imageContentBlocks.id, imageBlock.id));

			await tx.insert(schema.mediaTextContentBlocks).values({
				id: imageBlock.id,
				imageId: imageBlock.imageId,
				side: pair.side,
				content: richTextBlock.content,
			});

			await tx
				.update(schema.contentBlocks)
				.set({ typeId: mediaTextType.id })
				.where(eq(schema.contentBlocks.id, imageBlock.id));

			await tx.delete(schema.contentBlocks).where(eq(schema.contentBlocks.id, richTextBlock.id));

			await tx
				.update(schema.contentBlocks)
				.set({ position: sql`${schema.contentBlocks.position} - 1` })
				.where(
					and(
						eq(schema.contentBlocks.fieldId, imageBlock.fieldId),
						gt(schema.contentBlocks.position, richTextBlock.position),
					),
				);

			applied += 1;
		});
	}

	return applied;
}

/**
 * Prompts once per floated image, so an author can keep one floated and convert the next within the
 * same news item, and returns only the confirmed pairs. Skipped by `--all` (convert every pair) and
 * `--dry-run` (list only).
 */
async function confirmPairs(pairs: Array<Pair>): Promise<Array<Pair>> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	const confirmed: Array<Pair> = [];

	try {
		for (const pair of pairs) {
			const answer = await rl.question(
				`\n${pair.entitySlug} — floated image (${pair.side}), text beside it:\n  “${pair.preview}”\nConvert this to a media_text block? [y/N] `,
			);
			if (answer.trim().toLowerCase().startsWith("y")) {
				confirmed.push(pair);
			}
		}
	} finally {
		rl.close();
	}

	return confirmed;
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const convertAll = args.includes("--all");
	const dryRun = args.includes("--dry-run");
	const slugs = args.filter((arg) => !arg.startsWith("--"));

	if (slugs.length === 0) {
		log.error("Pass one or more news item slugs as positional arguments.");
		process.exitCode = 1;
		return;
	}

	const entitiesBySlug = await findNewsEntityBlocks(slugs);
	const pairs = findPairs(slugs, entitiesBySlug);

	log.info(
		`${String(pairs.length)} floated-image/text pairs found across ${String(slugs.length)} slugs.`,
	);

	if (dryRun || pairs.length === 0) {
		for (const pair of pairs) {
			log.info(`  ${pair.entitySlug} (${pair.side}): “${pair.preview}”`);
		}
		if (pairs.length > 0) {
			log.info(`Dry run — re-run without \`--dry-run\` to choose which to convert (or \`--all\`).`);
		}
		return;
	}

	// `--all` converts every pair; otherwise prompt per image so floats can be kept or promoted
	// individually within the same item.
	const selected = convertAll ? pairs : await confirmPairs(pairs);

	if (selected.length === 0) {
		log.info("Nothing selected; no changes made.");
		return;
	}

	const applied = await applyPairs(selected);
	log.success(`Collapsed ${String(applied)} pairs into media_text blocks.`);
}

main()
	.catch((error: unknown) => {
		log.error(error);
		process.exitCode = 1;
	})
	// oxlint-disable-next-line typescript/no-misused-promises, typescript/strict-void-return
	.finally(() => db.$client.end());
