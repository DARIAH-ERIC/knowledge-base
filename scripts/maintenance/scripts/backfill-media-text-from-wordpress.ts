import * as path from "node:path";

import { assert, createUrl, createUrlSearchParams, log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { and, eq, gt, sql } from "@dariah-eric/database/sql";
import slugify from "@sindresorhus/slugify";

import { env } from "../config/env.config";
import { writeTsvReport } from "../lib/tsv-report";

/**
 * Reconstructs `media_text` content blocks from WordPress's native "Media & Text"
 * (`wp-block-media-text`) blocks, which the migration flattened. Dry run by default; `--apply`
 * writes the changes.
 *
 * The migration (`@dariah-eric/migrate`) has no handler for `wp-block-media-text`, so it fell
 * through to the stock TipTap `StarterKit`, which doesn't understand the block: the `__media` image
 * became a standalone `image` block and the `__content` paragraphs a separate `rich_text` block —
 * losing the semantic pairing. Unlike a presentational `alignleft`/`alignright` float (handled by
 * `backfill-image-alignment`), a Media & Text block is an _explicit_ author choice to bind an image
 * to a passage of text, so it maps unambiguously onto `media_text` and needs no human vetting.
 *
 * Matching is conservative and structural: a WordPress Media & Text block is paired with a local
 * item only when exactly one `image` content block's asset carries that block's media URL as its
 * `label` (set verbatim by the migration's `upload()`) and the very next block is `rich_text`. The
 * `media_text` `side` follows the WordPress media position (`has-media-on-the-right` → `end`, else
 * `start`). Anything ambiguous — image reused, next block not `rich_text`, already collapsed — is
 * left out rather than guessed at.
 *
 * @example
 * 	pnpm run data:backfill:media-text-from-wordpress
 * 	pnpm run data:backfill:media-text-from-wordpress -- --apply
 */

const wordPressApiBaseUrl = "https://www.dariah.eu";

const cacheFolderPath = path.join(process.cwd(), ".cache");
const reportFilePath = path.join(cacheFolderPath, "media-text-from-wordpress.tsv");

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

interface WordPressPost {
	slug: string;
	content: { rendered: string };
}

/** Same `X-WP-TotalPages` pagination contract as the migration's `getAll`, kept local. */
async function fetchAllPosts(apiBaseUrl: string): Promise<Array<WordPressPost>> {
	const url = createUrl({
		baseUrl: apiBaseUrl,
		pathname: "/wp-json/wp/v2/posts",
		searchParams: createUrlSearchParams({ per_page: 100 }),
	});

	const results: Array<WordPressPost> = [];

	const response = await fetch(url);
	results.push(...((await response.json()) as Array<WordPressPost>));

	const pages = Number(response.headers.get("X-WP-TotalPages") ?? 1);

	for (let page = 2; page <= pages; page++) {
		url.searchParams.set("page", String(page));
		const pageResponse = await fetch(url);
		results.push(...((await pageResponse.json()) as Array<WordPressPost>));
	}

	return results;
}

/** Mirrors `normalizeWordPressSlug` from `@dariah-eric/migrate`: decode, then slugify. */
function normalizeWordPressSlug(rawSlug: string): string {
	let decoded: string;
	try {
		decoded = decodeURIComponent(rawSlug);
	} catch {
		decoded = rawSlug;
	}
	return slugify(decoded);
}

interface WordPressMediaText {
	side: (typeof schema.mediaTextSideEnum)[number];
	imageUrl: string;
}

/**
 * Finds `<div class="wp-block-media-text …"><figure class="wp-block-media-text__media …"><img
 * src="…">` — a Media & Text block whose media is an image — in document order. The `__media`
 * figure precedes `__content` in the markup regardless of visual side, so the first `img` after the
 * container open is the media image. Regex-based, matching the migration's approach to WordPress
 * HTML rather than a full DOM parser.
 */
function extractMediaTextBlocks(html: string): Array<WordPressMediaText> {
	const results: Array<WordPressMediaText> = [];
	const re =
		/<div[^>]+class="([^"]*\bwp-block-media-text\b[^"]*)"[^>]*>\s*<figure[^>]+class="[^"]*\bwp-block-media-text__media\b[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/gi;

	let match: RegExpExecArray | null;
	while ((match = re.exec(html)) !== null) {
		const containerClass = match[1]!;
		results.push({
			side: /\bhas-media-on-the-right\b/i.test(containerClass) ? "end" : "start",
			imageUrl: match[2]!,
		});
	}

	return results;
}

interface EntityBlock {
	blockId: string;
	fieldId: string;
	blockType: string;
	position: number;
	/** The exact source URL the migration uploaded this image from, for `image` blocks only. */
	imageAssetLabel: string | null;
}

/** Published `news` entities' `content` field blocks, ordered by position, keyed by entity slug. */
async function findNewsEntityBlocks(): Promise<
	Map<string, { documentId: string; blocks: Array<EntityBlock> }>
> {
	const rows = await db
		.select({
			documentId: schema.entities.id,
			slug: schema.entities.slug,
			blockId: schema.contentBlocks.id,
			fieldId: schema.contentBlocks.fieldId,
			blockType: schema.contentBlockTypes.type,
			position: schema.contentBlocks.position,
			imageAssetLabel: schema.assets.label,
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
		.leftJoin(schema.assets, eq(schema.assets.id, schema.imageContentBlocks.imageId))
		.where(
			and(
				eq(schema.entityTypes.type, "news"),
				eq(schema.entityStatus.type, "published"),
				eq(schema.entityTypesFieldsNames.fieldName, "content"),
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
			imageAssetLabel: row.imageAssetLabel,
		});
	}

	return bySlug;
}

interface Candidate {
	entitySlug: string;
	entityDocumentId: string;
	side: (typeof schema.mediaTextSideEnum)[number];
	wpImageUrl: string;
	fieldId: string;
	imageContentBlockId: string;
	imagePosition: number;
	richTextContentBlockId: string;
}

function findCandidates(
	posts: Array<WordPressPost>,
	entitiesBySlug: Map<string, { documentId: string; blocks: Array<EntityBlock> }>,
): Array<Candidate> {
	const candidates: Array<Candidate> = [];

	for (const post of posts) {
		const mediaTexts = extractMediaTextBlocks(post.content.rendered);
		if (mediaTexts.length === 0) {
			continue;
		}

		const slug = normalizeWordPressSlug(post.slug);
		const entity = entitiesBySlug.get(slug);
		if (entity == null) {
			continue;
		}

		const blocksByPosition = new Map(entity.blocks.map((block) => [block.position, block]));

		for (const mediaText of mediaTexts) {
			const matches = entity.blocks.filter(
				(block) => block.blockType === "image" && block.imageAssetLabel === mediaText.imageUrl,
			);
			// Ambiguous (image reused) or unmatched — skip rather than guess.
			if (matches.length !== 1) {
				continue;
			}
			const [imageBlock] = matches;

			const nextBlock = blocksByPosition.get(imageBlock!.position + 1);
			if (nextBlock?.blockType !== "rich_text") {
				continue;
			}

			candidates.push({
				entitySlug: slug,
				entityDocumentId: entity.documentId,
				side: mediaText.side,
				wpImageUrl: mediaText.imageUrl,
				fieldId: imageBlock!.fieldId,
				imageContentBlockId: imageBlock!.blockId,
				imagePosition: imageBlock!.position,
				richTextContentBlockId: nextBlock.blockId,
			});
		}
	}

	return candidates;
}

const reportColumns = [
	"entity_slug",
	"entity_document_id",
	"side",
	"wp_image_url",
	"image_content_block_id",
	"rich_text_content_block_id",
] as const;

async function writeReport(candidates: Array<Candidate>): Promise<void> {
	await writeTsvReport(
		reportFilePath,
		reportColumns,
		candidates.map((candidate) => [
			candidate.entitySlug,
			candidate.entityDocumentId,
			candidate.side,
			candidate.wpImageUrl,
			candidate.imageContentBlockId,
			candidate.richTextContentBlockId,
		]),
	);
}

/**
 * Collapses each pair inside its own transaction, re-reading both blocks first so a pairing that
 * changed since the report was generated (an editor touched the item, or a previous run already
 * applied it) is skipped rather than forced. Reuses the `image` block's row for the new
 * `media_text` block — only its type and subtype row change — and deletes the `rich_text` block,
 * then closes the position gap that leaves in the field.
 */
async function applyCandidates(candidates: Array<Candidate>): Promise<number> {
	const [mediaTextType] = await db
		.select({ id: schema.contentBlockTypes.id })
		.from(schema.contentBlockTypes)
		.where(eq(schema.contentBlockTypes.type, "media_text"))
		.limit(1);
	assert(mediaTextType, "Missing `media_text` content block type.");

	let applied = 0;

	for (const candidate of candidates) {
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
				.where(eq(schema.contentBlocks.id, candidate.imageContentBlockId))
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
				.where(eq(schema.contentBlocks.id, candidate.richTextContentBlockId))
				.limit(1);

			if (imageBlock == null || richTextBlock == null) {
				log.warn(
					`Skipping ${candidate.entitySlug} (${candidate.wpImageUrl}): block no longer exists.`,
				);
				return;
			}

			if (
				richTextBlock.fieldId !== imageBlock.fieldId ||
				richTextBlock.position !== imageBlock.position + 1
			) {
				log.warn(
					`Skipping ${candidate.entitySlug} (${candidate.wpImageUrl}): no longer adjacent — item was edited since the report was generated.`,
				);
				return;
			}

			await tx
				.delete(schema.imageContentBlocks)
				.where(eq(schema.imageContentBlocks.id, imageBlock.id));

			await tx.insert(schema.mediaTextContentBlocks).values({
				id: imageBlock.id,
				imageId: imageBlock.imageId,
				side: candidate.side,
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

async function main(): Promise<void> {
	const apply = process.argv.includes("--apply");

	log.info("Fetching WordPress posts…");
	const posts = await fetchAllPosts(wordPressApiBaseUrl);

	log.info("Loading migrated news content blocks…");
	const entitiesBySlug = await findNewsEntityBlocks();

	const candidates = findCandidates(posts, entitiesBySlug);

	await writeReport(candidates);

	log.info(
		`${String(candidates.length)} Media & Text blocks found across ${String(posts.length)} WordPress posts.`,
	);
	log.info(`Report written to \`${reportFilePath}\`.`);

	if (!apply) {
		log.info(`Pass \`--apply\` to collapse them into \`media_text\` blocks.`);
		return;
	}

	const applied = await applyCandidates(candidates);
	log.success(`Collapsed ${String(applied)} Media & Text blocks into media_text blocks.`);
}

main()
	.catch((error: unknown) => {
		log.error(error);
		process.exitCode = 1;
	})
	// oxlint-disable-next-line typescript/no-misused-promises, typescript/strict-void-return
	.finally(() => db.$client.end());
