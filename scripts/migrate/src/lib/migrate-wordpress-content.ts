import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
	assert,
	createUrl,
	createUrlSearchParams,
	isNonEmptyString,
	log,
	unreachable,
} from "@acdh-oeaw/lib";
import { type Database, type Transaction, plainTextToRichText } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import type { StorageService } from "@dariah-eric/storage";
import type { AssetPrefix } from "@dariah-eric/storage/config";
import { type Dimensions, buffer, toDisplayDimensions } from "@dariah-eric/storage/lib";
import slugify from "@sindresorhus/slugify";
import type { JSONContent } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table/kit";
import { generateJSON } from "@tiptap/html";
import { StarterKit } from "@tiptap/starter-kit";
import { toText } from "hast-util-to-text";
import fromHtml from "rehype-parse";
import sharp from "sharp";
import { unified } from "unified";

import {
	apiBaseUrl,
	assetsCacheFilePath,
	assetsCacheFolderPath,
} from "../../config/data-migration.config";
import { cleanTiptapDoc } from "./clean-tiptap-content";
import type { WordPressData } from "./get-wordpress-data";

const processor = unified().use(fromHtml);

/**
 * Extensions used to parse WordPress HTML into TipTap JSON. Every node type the editor understands
 * must be listed here, or its markup is silently unwrapped: a `<table>` parsed without `TableKit`
 * collapses into a single paragraph of run-together cell text. Mirrors `createRichTextExtensions`
 * in `@dariah-eric/ui`, which cannot be imported here (it is a client component).
 */
export const wordPressParseExtensions = [StarterKit, Image, TableKit];

export function toPlaintext(html: string): string {
	const ast = processor.parse(html);
	return toText(ast);
}

/**
 * WordPress stores `post_name`/slug values URL-encoded for non-Latin titles (e.g. Cyrillic "а" →
 * "%d0%b0"). Inserted verbatim, such slugs don't survive the browser→server URL round-trip and 404
 * on both the dashboard and the public site. Percent-decode, then slugify, so the stored slug is
 * clean transliterated ASCII — matching how UI-created entities and the institution import already
 * build slugs. Idempotent for already-clean slugs; falls back to the title when the slug is empty
 * or slugifies to nothing.
 */
export function normalizeWordPressSlug(
	rawSlug: string | null | undefined,
	fallback: string,
): string {
	const source = isNonEmptyString(rawSlug) ? rawSlug : fallback;
	let decoded: string;
	try {
		decoded = decodeURIComponent(source);
	} catch {
		// `source` had a malformed percent-sequence; slugify it as-is.
		decoded = source;
	}
	const slug = slugify(decoded);
	return slug !== "" ? slug : slugify(fallback);
}

export function toSummary(html: string): string {
	return toPlaintext(html)
		.replace(/\s*read more\s*$/i, "")
		.trim();
}

/** What `buffer.getMetadata` measured on an image, which the storage service also takes verbatim. */
type ImageMetadata = Awaited<ReturnType<typeof buffer.getMetadata>>;

/**
 * Maximum image resolution (total pixels) imgproxy will render. Must match `imageMaxResolution` in
 * `apps/knowledge-base/config/assets.config.ts` and the `IMGPROXY_MAX_SRC_RESOLUTION` setting (in
 * megapixels) of the imgproxy deployment.
 */
const imageMaxResolution = 50 * 1_000_000;

/** Vector images have no raster resolution: nothing to clamp, and no meaningful dimensions. */
const vectorImageFormat = "svg";

/**
 * How far a derivative's aspect ratio may drift from its original's before it counts as a crop
 * rather than a downscale. WordPress rounds derivative dimensions to whole pixels, which moves the
 * ratio by well under a percent even for the smallest sizes, while a hard crop moves it by tens.
 */
const aspectRatioTolerance = 0.02;

/** A url ending in WordPress's `-<width>x<height>` derivative suffix, e.g. `…-612x612.webp`. */
const derivativeUrlPattern = /-\d+x\d+\.[a-z0-9]+$/i;

/** The fields of a WordPress media item this module reads; `wp-types` leaves `media_details` open. */
interface WordPressMediaItem {
	id: number;
	source_url: string;
	media_details?: {
		width?: number;
		height?: number;
		sizes?: Record<string, { source_url?: string; width?: number; height?: number }>;
	};
}

/** A WordPress media item's full size, paired with the derivative an `<img src>` pointed at. */
export interface WordPressOriginal {
	mediaId: number;
	derivative: Dimensions;
	full: Dimensions;
	fullUrl: string;
}

/**
 * Compared on host and path only: urls copied out of post markup may spell the host with or without
 * `www.` and percent-encode non-ascii filenames that the media endpoint returns decoded.
 */
function normaliseImageUrl(value: string): string {
	try {
		const url = new URL(value);
		return `${url.host.replace(/^www\./, "")}${decodeURIComponent(url.pathname)}`;
	} catch {
		return value;
	}
}

function isSameAspectRatio(derivative: Dimensions, full: Dimensions): boolean {
	const derivativeRatio = derivative.width / derivative.height;
	const fullRatio = full.width / full.height;

	return Math.abs(derivativeRatio - fullRatio) / fullRatio <= aspectRatioTolerance;
}

/**
 * Every derivative url the given media items know about, mapped to the original they were cut from.
 * A url two media items both claim maps to `null` — impossible to resolve, so never acted on.
 */
export function indexWordPressDerivatives(
	media: Iterable<WordPressMediaItem>,
): Map<string, WordPressOriginal | null> {
	const index = new Map<string, WordPressOriginal | null>();

	for (const item of media) {
		const details = item.media_details;
		const full =
			details?.width != null && details.height != null
				? { width: details.width, height: details.height }
				: undefined;

		if (full == null || details?.sizes == null) {
			continue;
		}

		for (const size of Object.values(details.sizes)) {
			if (size.source_url == null || size.width == null || size.height == null) {
				continue;
			}

			const key = normaliseImageUrl(size.source_url);
			const existing = index.get(key);

			// The same file is often registered under several size names (`medium_large` and a theme's
			// own square both land on 768×768); only a second *media item* is ambiguous.
			if (existing !== undefined && existing?.mediaId !== item.id) {
				index.set(key, null);
				continue;
			}

			index.set(key, {
				mediaId: item.id,
				derivative: { width: size.width, height: size.height },
				full,
				fullUrl: item.source_url,
			});
		}
	}

	return index;
}

/**
 * The url whose bytes should be stored for an `<img src>`, given what WordPress knows about it.
 *
 * WordPress renders an inline image at a theme size and writes that derivative into the post html
 * (`<img src="…/atrium-summer-school-612x612.webp">`), offering the larger variants in `srcset`
 * only. Storing the derivative leaves the image soft wherever this site renders it larger than
 * WordPress did — the `featured` variant alone asks for 1600px — so the original is stored
 * instead.
 *
 * Only a pure downscale is swapped out. WordPress hard-crops some sizes (`thumbnail` is a square
 * cut out of the frame), so a derivative whose aspect ratio differs from its original was composed
 * by the crop, and replacing it would change what the image shows rather than sharpen it.
 */
export function toFullResolutionUrl(url: URL, original: WordPressOriginal | null | undefined): URL {
	if (original == null) {
		return url;
	}

	if (original.full.width <= original.derivative.width) {
		return url;
	}

	if (!isSameAspectRatio(original.derivative, original.full)) {
		return url;
	}

	return new URL(original.fullUrl);
}

/**
 * Derivatives indexed from media the caller already holds — the bulk migration's cached payload.
 * Consulted first so a bulk run resolves against the same snapshot it migrates from.
 */
let seededDerivatives: Map<string, WordPressOriginal | null> | null = null;

/** Every media item on the site, fetched once per process and only if a lookup misses. */
let allDerivatives: Promise<Map<string, WordPressOriginal | null>> | null = null;

/** Media items already searched for, so a url shared by several posts costs one request. */
const searchedDerivatives = new Map<string, WordPressOriginal | null | undefined>();

/**
 * Hands the resolver the media the caller has already fetched, so it does not go back to WordPress
 * for a list it is holding.
 */
export function seedWordPressMedia(media: WordPressData["media"]): void {
	seededDerivatives = indexWordPressDerivatives(Object.values(media));
}

async function fetchMediaPage(searchParams: Record<string, number | string>) {
	const url = createUrl({
		baseUrl: apiBaseUrl,
		pathname: "/wp-json/wp/v2/media",
		searchParams: createUrlSearchParams(searchParams),
	});

	const response = await fetch(url);

	if (!response.ok) {
		return { items: [] as Array<WordPressMediaItem>, pages: 1 };
	}

	return {
		items: (await response.json()) as Array<WordPressMediaItem>,
		pages: Number(response.headers.get("X-WP-TotalPages") ?? 1),
	};
}

/**
 * Narrows the media library to the items whose title or filename resembles the derivative's, then
 * lets the exact url match below decide. The filename is only ever used to _find_ candidates, never
 * to construct the original's url: `paris-1200x565.png` is an original whose name happens to end in
 * a size suffix, and asking WordPress for a file with the suffix stripped would 404.
 */
async function searchDerivative(url: URL): Promise<WordPressOriginal | null | undefined> {
	const key = normaliseImageUrl(url.href);

	if (searchedDerivatives.has(key)) {
		return searchedDerivatives.get(key);
	}

	const filename = decodeURIComponent(url.pathname).split("/").pop() ?? "";
	const search = filename.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "");

	const { items } = await fetchMediaPage({ per_page: 100, search });
	const original = indexWordPressDerivatives(items).get(key);

	searchedDerivatives.set(key, original);

	return original;
}

/** Fetches and indexes the whole media library — the fallback when a search comes up empty. */
function getAllDerivatives(): Promise<Map<string, WordPressOriginal | null>> {
	allDerivatives ??= (async () => {
		log.info("Indexing the WordPress media library...");

		const items: Array<WordPressMediaItem> = [];

		const first = await fetchMediaPage({ per_page: 100 });
		items.push(...first.items);

		for (let page = 2; page <= first.pages; page++) {
			const next = await fetchMediaPage({ per_page: 100, page });
			items.push(...next.items);
		}

		return indexWordPressDerivatives(items);
	})();

	return allDerivatives;
}

/**
 * Resolves an inline image url to the full-size original WordPress holds, so nothing has to be
 * upgraded after the fact by `data:backfill:full-resolution-images`. A url that carries no
 * derivative suffix is already an original and costs no request; one that does is looked up in the
 * seeded media, then by search, then in the full media library, and left as it is when none of
 * those knows it (an image hosted elsewhere, or one since deleted from the media library).
 */
export async function resolveFullResolutionUrl(url: URL): Promise<URL> {
	if (!derivativeUrlPattern.test(decodeURIComponent(url.pathname))) {
		return url;
	}

	const key = normaliseImageUrl(url.href);

	const seeded = seededDerivatives?.get(key);
	if (seeded !== undefined) {
		return toFullResolutionUrl(url, seeded);
	}

	const searched = await searchDerivative(url);
	if (searched !== undefined) {
		return toFullResolutionUrl(url, searched);
	}

	const known = (await getAllDerivatives()).get(key);
	if (known === undefined) {
		log.warn(`No WordPress original found for "${url.href}". Storing it as it is.`);
	}

	return toFullResolutionUrl(url, known);
}

/**
 * Downscales an image past imgproxy's source-resolution limit to fit within it, mirroring
 * `prepareImageForUpload` in the dashboard: above the limit imgproxy refuses to render the image at
 * all, and a handful of WordPress originals are 250MP scans. Anything within the limit is passed
 * through untouched rather than re-encoded.
 */
async function clampToMaxResolution(
	image: Buffer,
	metadata: ImageMetadata,
): Promise<{ image: Buffer; metadata: ImageMetadata }> {
	const resolution = metadata.width * metadata.height;

	if (
		metadata.format === vectorImageFormat ||
		!Number.isFinite(resolution) ||
		resolution <= imageMaxResolution
	) {
		return { image, metadata };
	}

	const scale = Math.sqrt(imageMaxResolution / resolution);

	const resized = await sharp(image)
		/** Bake EXIF orientation into the pixels before we strip metadata during re-encoding. */
		.rotate()
		.resize({
			fit: "inside",
			height: Math.floor(metadata.height * scale),
			width: Math.floor(metadata.width * scale),
		})
		.toBuffer();

	// Measured rather than computed from `scale`: `.rotate()` has baked in the orientation by now,
	// and `fit: "inside"` rounds to preserve the aspect ratio.
	return { image: resized, metadata: await buffer.getMetadata(resized) };
}

/**
 * The dimensions to record for a stored image, or `null` for a vector — which has no raster
 * resolution, and whose `assets.width`/`assets.height` therefore have to stay null so consumers
 * read them as "no upper bound" rather than as a `srcset` ceiling.
 */
function toStoredDimensions(metadata: ImageMetadata): Dimensions | null {
	if (metadata.format === vectorImageFormat) {
		return null;
	}

	return toDisplayDimensions({
		width: metadata.width,
		height: metadata.height,
		orientation: metadata.orientation,
	});
}

export type AssetsCache = Map<string, string>;

export async function readAssetsCacheData(): Promise<AssetsCache> {
	if (existsSync(assetsCacheFilePath)) {
		const data = await fs.readFile(assetsCacheFilePath, { encoding: "utf-8" });
		const cache = JSON.parse(data) as Array<[string, string]>;
		return new Map(cache);
	}

	await fs.mkdir(assetsCacheFolderPath, { recursive: true });

	return new Map();
}

export async function writeAssetsCacheData(cache: AssetsCache): Promise<void> {
	await fs.writeFile(assetsCacheFilePath, JSON.stringify(Array.from(cache)), { encoding: "utf-8" });
}

/** Returns the index just after the `</div>` that closes the div opened at `afterOpenTag`. */
function findClosingDiv(html: string, afterOpenTag: number): number {
	let depth = 1;
	let i = afterOpenTag;
	while (i < html.length && depth > 0) {
		const nextOpen = html.indexOf("<div", i);
		const nextClose = html.indexOf("</div>", i);
		if (nextClose === -1) {
			break;
		}
		if (nextOpen !== -1 && nextOpen < nextClose) {
			depth++;
			i = nextOpen + 4;
		} else {
			depth--;
			i = nextClose + 6;
		}
	}
	return i;
}

/** Extracts accordion items from an Easy Accordion (`sp-easy-accordion`) div. */
function extractAccordionItems(html: string): Array<{ title: string; bodyHtml: string }> {
	const items: Array<{ title: string; bodyHtml: string }> = [];
	const singleRe = /<div[^>]+class="[^"]*sp-ea-single[^"]*"[^>]*>/gi;
	let m: RegExpExecArray | null;

	while ((m = singleRe.exec(html)) !== null) {
		const itemEnd = findClosingDiv(html, m.index + m[0].length);
		const itemHtml = html.slice(m.index, itemEnd);

		const headerMatch = /<([a-z0-9]+)[^>]+class="[^"]*ea-header[^"]*"[^>]*>([\s\S]*?)<\/\1>/i.exec(
			itemHtml,
		);
		const headerHtml = headerMatch?.[2] ?? "";
		const anchorMatch = /<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(headerHtml);
		const titleSource = anchorMatch?.[1] ?? headerHtml;
		const title = titleSource
			.replaceAll(/<[^>]+>/g, "")
			.replaceAll("&nbsp;", " ")
			.trim();

		const bodyOpenMatch = /<div[^>]+class="[^"]*ea-body[^"]*"[^>]*>/i.exec(itemHtml);
		let bodyHtml = "";
		if (bodyOpenMatch) {
			const bodyContentStart = bodyOpenMatch.index + bodyOpenMatch[0].length;
			const bodyEnd = findClosingDiv(itemHtml, bodyContentStart);
			bodyHtml = itemHtml.slice(bodyContentStart, bodyEnd - 6);
		}

		if (title || bodyHtml) {
			items.push({ title, bodyHtml });
		}
	}

	return items;
}

export interface WordPressContentMigrator {
	upload: (
		prefix: AssetPrefix,
		assetsCache: AssetsCache,
		url: URL,
		label: string,
		caption?: string,
		alt?: string,
	) => Promise<{ id: string } | undefined>;
	uploadFeaturedImage: (
		prefix: AssetPrefix,
		assetsCache: AssetsCache,
		media: WordPressData["media"],
		mediaId: number | undefined,
		id: number,
	) => Promise<string | null>;
	migrateHtmlContent: (
		tx: Transaction,
		html: string,
		assetsCache: AssetsCache,
		fieldId: string,
		contentBlockTypes: Record<string, { id: string }>,
	) => Promise<void>;
}

/**
 * Builds the WordPress → knowledge-base content helpers around a database and storage service.
 * Shared by the bulk migration (`migrate-wordpress.ts`) and the single-item migration
 * (`migrate-wordpress-news-item.ts`) so both upload assets and parse richtext content identically.
 */
export function createWordPressContentMigrator(
	db: Database,
	storage: StorageService,
): WordPressContentMigrator {
	async function readCached(assetsCache: AssetsCache, url: URL) {
		const cacheKey = String(url);

		if (assetsCache.has(cacheKey)) {
			const filePath = path.join(assetsCacheFolderPath, assetsCache.get(cacheKey)!);
			const input = await buffer.fromFilePath(filePath);
			const metadata = await buffer.getMetadata(input);

			return { input, metadata };
		}

		const input = await buffer.fromUrl(url);
		const metadata = await buffer.getMetadata(input);

		const outputFilePath = path.join(assetsCacheFolderPath, `${randomUUID()}.${metadata.format}`);
		await fs.writeFile(outputFilePath, input);
		assetsCache.set(cacheKey, path.relative(assetsCacheFolderPath, outputFilePath));
		await writeAssetsCacheData(assetsCache);

		return { input, metadata };
	}

	async function upload(
		prefix: AssetPrefix,
		assetsCache: AssetsCache,
		url: URL,
		label: string,
		caption?: string,
		alt?: string,
	) {
		const cached = await readCached(assetsCache, url);
		const { image, metadata } = await clampToMaxResolution(cached.input, cached.metadata);
		const dimensions = toStoredDimensions(metadata);

		const { key } = (await storage.upload({ prefix, input: image, metadata })).unwrap();

		const [asset] = await db
			.insert(schema.assets)
			.values({
				key,
				label,
				mimeType: metadata["content-type"],
				caption: caption === "Read more" ? null : plainTextToRichText(caption),
				alt,
				size: image.byteLength,
				width: dimensions?.width,
				height: dimensions?.height,
			})
			.returning({ id: schema.assets.id });

		return asset;
	}

	async function uploadFeaturedImage(
		prefix: AssetPrefix,
		assetsCache: AssetsCache,
		media: WordPressData["media"],
		mediaId: number | undefined,
		id: number,
	) {
		if (mediaId == null || mediaId === 0) {
			return null;
		}

		const image = media[mediaId];
		assert(image != null, `Missing featured image (entity id ${String(id)}).`);

		const url = new URL(image.source_url);
		const label = toPlaintext(image.title.rendered).trim();
		const caption = toPlaintext(image.caption.rendered).trim();
		const alt = image.alt_text;
		const asset = await upload(prefix, assetsCache, url, label, caption, alt);

		assert(asset, `Missing asset (entity id ${String(id)}).`);

		return asset.id;
	}

	/**
	 * Parses WordPress HTML into content blocks, handling inline images (uploaded as assets and
	 * stored as image content blocks), iframe embeds, and Easy Accordion widgets. Text segments
	 * between specials become rich_text blocks. Blocks are inserted in order into the given field.
	 */
	async function migrateHtmlContent(
		tx: Transaction,
		html: string,
		assetsCache: AssetsCache,
		fieldId: string,
		contentBlockTypes: Record<string, { id: string }>,
	): Promise<void> {
		type BlockSpec =
			| { type: "rich_text"; content: JSONContent }
			| { type: "image"; assetId: string }
			| { type: "embed"; url: string; title: string }
			| { type: "accordion"; items: Array<{ title: string; content: JSONContent }> };

		const blocks: Array<BlockSpec> = [];

		// Collect all special positions (iframes + accordions) sorted by index.
		interface SpecialMatch {
			index: number;
			end: number;
			segment:
				| { kind: "iframe"; src: string; title: string }
				| { kind: "accordion"; items: Array<{ title: string; bodyHtml: string }> };
		}
		const specials: Array<SpecialMatch> = [];

		const iframeRe = /<iframe(?:\s[^>]*)?\ssrc="([^"]*)"[^>]*>[\s\S]*?<\/iframe>/gi;
		let m: RegExpExecArray | null;

		while ((m = iframeRe.exec(html)) !== null) {
			const titleMatch = /title="([^"]*)"/.exec(m[0]);
			specials.push({
				index: m.index,
				end: m.index + m[0].length,
				segment: { kind: "iframe", src: m[1]!, title: titleMatch?.[1] ?? m[1]! },
			});
		}

		const accordionRe = /<div[^>]+class="[^"]*sp-easy-accordion[^"]*"[^>]*>/gi;

		while ((m = accordionRe.exec(html)) !== null) {
			const end = findClosingDiv(html, m.index + m[0].length);
			specials.push({
				index: m.index,
				end,
				segment: { kind: "accordion", items: extractAccordionItems(html.slice(m.index, end)) },
			});
		}

		specials.sort((a, b) => a.index - b.index);

		type Segment =
			| { kind: "html"; content: string }
			| { kind: "iframe"; src: string; title: string }
			| { kind: "accordion"; items: Array<{ title: string; bodyHtml: string }> };

		const segments: Array<Segment> = [];
		let lastIndex = 0;
		for (const special of specials) {
			if (special.index > lastIndex) {
				segments.push({ kind: "html", content: html.slice(lastIndex, special.index) });
			}
			segments.push(special.segment);
			lastIndex = special.end;
		}
		if (lastIndex < html.length) {
			segments.push({ kind: "html", content: html.slice(lastIndex) });
		}

		for (const segment of segments) {
			if (segment.kind === "iframe") {
				blocks.push({ type: "embed", url: segment.src, title: segment.title });
				continue;
			}

			if (segment.kind === "accordion") {
				blocks.push({
					type: "accordion",
					items: segment.items.map(({ title, bodyHtml }) => {
						return {
							title,
							content: cleanTiptapDoc(generateJSON(bodyHtml, wordPressParseExtensions)),
						};
					}),
				});
				continue;
			}

			const doc = cleanTiptapDoc(generateJSON(segment.content, wordPressParseExtensions));
			let richTextRun: Array<JSONContent> = [];

			for (const node of doc.content ?? []) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				if (node.type === "image" && typeof node.attrs?.src === "string") {
					if (richTextRun.length > 0) {
						blocks.push({
							type: "rich_text",
							content: { type: "doc", content: richTextRun },
						});
						richTextRun = [];
					}
					try {
						/**
						 * The original rather than the theme-sized derivative the post markup points at, and
						 * labelled with the url its bytes actually came from.
						 */
						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
						const source = await resolveFullResolutionUrl(new URL(node.attrs.src));

						const asset = await upload(
							"images",
							assetsCache,
							source,
							source.href,
							undefined,
							// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
							typeof node.attrs.alt === "string" && node.attrs.alt !== ""
								? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
									node.attrs.alt
								: undefined,
						);
						if (asset != null) {
							blocks.push({ type: "image", assetId: asset.id });
						}
					} catch {
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
						log.warn(`Failed to migrate inline image: ${node.attrs.src}`);
					}
				} else {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					richTextRun.push(node);
				}
			}

			if (richTextRun.length > 0) {
				blocks.push({ type: "rich_text", content: { type: "doc", content: richTextRun } });
			}
		}

		for (const [position, block] of blocks.entries()) {
			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({
					position,
					fieldId,
					typeId: contentBlockTypes[block.type]!.id,
				})
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			switch (block.type) {
				case "rich_text": {
					await tx
						.insert(schema.richTextContentBlocks)
						.values({ id: contentBlock.id, content: block.content });

					break;
				}

				case "image": {
					await tx
						.insert(schema.imageContentBlocks)
						.values({ id: contentBlock.id, imageId: block.assetId, caption: null });

					break;
				}

				case "embed": {
					await tx
						.insert(schema.embedContentBlocks)
						.values({ id: contentBlock.id, url: block.url, title: block.title, caption: null });

					break;
				}

				// An accordion is its panels, and a panel is its blocks: each parsed item becomes an
				// `accordion_item` child carrying its body as a `rich_text` grandchild, which is the same
				// shape the editor writes.
				case "accordion": {
					await tx.insert(schema.accordionContentBlocks).values({ id: contentBlock.id });

					for (const [itemPosition, item] of block.items.entries()) {
						const insertedItem: Array<{ id: string }> = await tx
							.insert(schema.contentBlocks)
							.values({
								position: itemPosition,
								fieldId,
								parentBlockId: contentBlock.id,
								typeId: contentBlockTypes["accordion_item"]!.id,
							})
							.returning({ id: schema.contentBlocks.id });
						const itemBlock: { id: string } | undefined = insertedItem[0];
						assert(itemBlock);

						await tx
							.insert(schema.accordionItemContentBlocks)
							.values({ id: itemBlock.id, title: item.title });

						const insertedBody: Array<{ id: string }> = await tx
							.insert(schema.contentBlocks)
							.values({
								position: 0,
								fieldId,
								parentBlockId: itemBlock.id,
								typeId: contentBlockTypes["rich_text"]!.id,
							})
							.returning({ id: schema.contentBlocks.id });
						const bodyBlock: { id: string } | undefined = insertedBody[0];
						assert(bodyBlock);

						await tx
							.insert(schema.richTextContentBlocks)
							.values({ id: bodyBlock.id, content: item.content });
					}

					break;
				}

				default: {
					unreachable();
				}
			}
		}
	}

	return { upload, uploadFeaturedImage, migrateHtmlContent };
}
