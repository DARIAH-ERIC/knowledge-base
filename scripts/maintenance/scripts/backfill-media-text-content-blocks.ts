import * as path from "node:path";

import { assert, createUrl, createUrlSearchParams, log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { and, eq, gt, sql } from "@dariah-eric/database/sql";
import slugify from "@sindresorhus/slugify";

import { env } from "../config/env.config";
import { writeTsvReport } from "../lib/tsv-report";

/**
 * Collapses a migrated `image` block immediately followed by a `rich_text` block into a single
 * `media_text` block, for news items whose original WordPress markup floated the image
 * (`wp-block-image`/`alignleft`/`alignright`) next to that paragraph. Dry run by default; `--apply`
 * writes the changes.
 *
 * The original WordPress migration (`@dariah-eric/migrate`) parsed content with the stock TipTap
 * `Image` extension, which only reads `src`/`alt`/`title` — the wrapping `<figure class="alignleft
 * …">` is not a recognised node, so it was silently unwrapped and the float lost. That information
 * only still exists in the live WordPress site, so this re-fetches it from there rather than trying
 * to recover it from already-migrated data.
 *
 * Matching is conservative and structural, not fuzzy: a WordPress image is only paired with a local
 * block when (a) an `image` content block's asset carries that exact WordPress image URL as its
 * `label` (set verbatim by the migration's `upload()` step) and (b) the very next block in that
 * field is `rich_text`. Anything else — a slug that no longer resolves (renamed since migration, or
 * adjusted for a `(type, slug)` collision), an image reused more than once in the article, an
 * editor having since restructured the item — is left out of the report rather than guessed at.
 *
 * @example
 * 	pnpm run data:backfill:media-text-content-blocks
 * 	pnpm run data:backfill:media-text-content-blocks -- --apply
 */

const wordPressApiBaseUrl = "https://www.dariah.eu";

const cacheFolderPath = path.join(process.cwd(), ".cache");
const reportFilePath = path.join(cacheFolderPath, "media-text-content-blocks.tsv");

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

/**
 * Same pagination contract as the migration's `getAll` (`X-WP-TotalPages`), kept local to avoid a
 * cross-package dependency on `@dariah-eric/migrate` for one header-driven loop.
 */
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

/**
 * Mirrors `normalizeWordPressSlug` from `@dariah-eric/migrate` closely enough for matching
 * purposes: decode, then slugify. Skips that function's empty-slug fallback to a plaintext title —
 * WordPress posts always carry a real slug, so that branch is not reachable here.
 */
function normalizeWordPressSlug(rawSlug: string): string {
	let decoded: string;
	try {
		decoded = decodeURIComponent(rawSlug);
	} catch {
		decoded = rawSlug;
	}
	return slugify(decoded);
}

interface WordPressFloatedImage {
	side: (typeof schema.mediaTextSideEnum)[number];
	imageUrl: string;
}

/**
 * Finds `<div class="wp-block-image"><figure class="align(left|right) …"><img
 * src="…">…</figure></div>` — the Gutenberg "image" block with alignment set — in document order.
 * Regex-based, matching the migration's own approach to WordPress HTML (`extractAccordionItems`,
 * the iframe scan) rather than a full DOM parser.
 */
function extractFloatedImages(html: string): Array<WordPressFloatedImage> {
	const results: Array<WordPressFloatedImage> = [];
	const re =
		/<div[^>]+class="[^"]*\bwp-block-image\b[^"]*"[^>]*>\s*<figure[^>]+class="[^"]*\balign(left|right)\b[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<\/figure>\s*<\/div>/gi;

	let match: RegExpExecArray | null;
	while ((match = re.exec(html)) !== null) {
		results.push({ side: match[1] as "left" | "right", imageUrl: match[2]! });
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

interface CandidatePair {
	entitySlug: string;
	entityDocumentId: string;
	side: (typeof schema.mediaTextSideEnum)[number];
	wpImageUrl: string;
	fieldId: string;
	imageContentBlockId: string;
	imagePosition: number;
	richTextContentBlockId: string;
}

function findCandidatePairs(
	posts: Array<WordPressPost>,
	entitiesBySlug: Map<string, { documentId: string; blocks: Array<EntityBlock> }>,
): Array<CandidatePair> {
	const candidates: Array<CandidatePair> = [];

	for (const post of posts) {
		const floatedImages = extractFloatedImages(post.content.rendered);
		if (floatedImages.length === 0) {
			continue;
		}

		const slug = normalizeWordPressSlug(post.slug);
		const entity = entitiesBySlug.get(slug);
		if (entity == null) {
			continue;
		}

		const blocksByPosition = new Map(entity.blocks.map((block) => [block.position, block]));

		for (const floated of floatedImages) {
			const imageBlock = entity.blocks.find(
				(block) => block.blockType === "image" && block.imageAssetLabel === floated.imageUrl,
			);
			if (imageBlock == null) {
				continue;
			}

			const nextBlock = blocksByPosition.get(imageBlock.position + 1);
			if (nextBlock?.blockType !== "rich_text") {
				continue;
			}

			candidates.push({
				entitySlug: slug,
				entityDocumentId: entity.documentId,
				side: floated.side,
				wpImageUrl: floated.imageUrl,
				fieldId: imageBlock.fieldId,
				imageContentBlockId: imageBlock.blockId,
				imagePosition: imageBlock.position,
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

async function writeReport(candidates: Array<CandidatePair>): Promise<void> {
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
async function applyCandidates(candidates: Array<CandidatePair>): Promise<number> {
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

	const candidates = findCandidatePairs(posts, entitiesBySlug);

	await writeReport(candidates);

	log.info(
		`${String(candidates.length)} floated-image/text pairs found across ${String(posts.length)} WordPress posts.`,
	);
	log.info(`Report written to \`${reportFilePath}\`.`);

	if (!apply) {
		log.info(`Pass \`--apply\` to collapse them into \`media_text\` blocks.`);
		return;
	}

	const applied = await applyCandidates(candidates);
	log.success(`Collapsed ${String(applied)} pairs into media_text blocks.`);
}

main()
	.catch((error: unknown) => {
		log.error(error);
		process.exitCode = 1;
	})
	// oxlint-disable-next-line typescript/no-misused-promises, typescript/strict-void-return
	.finally(() => db.$client.end());
