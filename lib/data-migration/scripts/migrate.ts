import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { assert, isNonEmptyString, keyBy, log, unreachable } from "@acdh-oeaw/lib";
import { db, type Transaction } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { createStorageService } from "@dariah-eric/storage";
import type { AssetPrefix } from "@dariah-eric/storage/config";
import { buffer } from "@dariah-eric/storage/lib";
import slugify from "@sindresorhus/slugify";
import type { JSONContent } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { generateJSON } from "@tiptap/html";
import { StarterKit } from "@tiptap/starter-kit";
import { toText } from "hast-util-to-text";
import fromHtml from "rehype-parse";
import { unified } from "unified";

import {
	apiBaseUrl,
	assetsCacheFilePath,
	assetsCacheFolderPath,
	cacheFilePath,
	cacheFolderPath,
	placeholderImageUrl,
} from "../config/data-migration.config";
import { env } from "../config/env.config";
import { getWordPressData, type WordPressData } from "../src/lib/get-wordpress-data";

const processor = unified().use(fromHtml);

function toPlaintext(html: string): string {
	const ast = processor.parse(html);
	return toText(ast);
}

function toSummary(html: string): string {
	return toPlaintext(html)
		.replace(/\s*read more\s*$/i, "")
		.trim();
}

function extractAuthorsFromHtml(html: string): Array<string> {
	const lines = toPlaintext(html)
		.split(/\r?\n+/)
		.map((line) => {
			return line.trim();
		})
		.filter((line) => {
			return line.length > 0;
		})
		.slice(0, 20);

	const affiliations = [
		"university",
		"college",
		"institute",
		"institut",
		"dariah",
		"clariah",
		"professor",
		"assistant",
		"associate",
		"scientific",
		"lecturer",
		"research",
		"department",
		"school",
		"faculty",
		"centre",
		"center",
		"library",
		"museum",
		"archive",
		"editor",
		"editors",
		"course editors",
		"one of the course editors",
		"followed by",
	];

	const isLikelyName = (value: string): boolean => {
		const parts = value.trim().split(/\s+/);

		if (parts.length < 2 || parts.length > 5) {
			return false;
		}

		return parts.every((part, index) => {
			if (/^[A-Z]\.$/u.test(part)) {
				return true;
			}

			if (index > 0 && /^(?:de|del|van|von|da|di|du|la|le|der|den)$/i.test(part)) {
				return true;
			}

			return /^[A-Z][\p{L}'’.-]*$/u.test(part);
		});
	};

	const cleanCandidate = (value: string): Array<string> => {
		let candidate = value.trim().replaceAll(/\s+/g, " ");

		if (candidate.length === 0) {
			return [];
		}

		candidate = candidate.replace(/\s*\([^)]*\)\s*$/, "");
		candidate = candidate.replace(/\s*\[[^\]]*\]\s*$/, "");
		candidate = candidate.split(",")[0] ?? candidate;
		candidate = candidate.split(" - ")[0] ?? candidate;
		candidate = candidate.split(" – ")[0] ?? candidate;
		candidate = candidate.split(" — ")[0] ?? candidate;
		candidate = candidate.trim();

		if (candidate.length === 0) {
			return [];
		}

		const pieces = candidate.split(/[,;/&]|\sand\s/i);

		return pieces
			.map((piece) => {
				return piece.trim();
			})
			.filter((piece) => {
				return piece.length > 0;
			})
			.filter((piece) => {
				const lower = piece.toLowerCase();

				if (
					affiliations.some((marker) => {
						return lower.includes(marker);
					})
				) {
					return false;
				}

				return isLikelyName(piece);
			});
	};

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index]!;
		const bylineMatch = /^(?:written by|lead author|by)\s*:?\s*/i.exec(line);

		if (bylineMatch != null) {
			const authors = cleanCandidate(line.slice(bylineMatch[0].length));

			if (authors.length > 0) {
				return authors;
			}

			const continuation = lines.slice(index + 1, index + 4).join(" ");
			const continuationAuthors = cleanCandidate(continuation);

			if (continuationAuthors.length > 0) {
				return continuationAuthors;
			}
		}
	}

	return [];
}

const deniedPageLinks = new Set([
	"https://www.dariah.eu/about/documents-list/", // documents-policies
	"https://www.dariah.eu/", // landing page uses visual composer shortcodes
]);

const storage = createStorageService({
	config: {
		accessKey: env.S3_ACCESS_KEY,
		bucketName: env.S3_BUCKET_NAME,
		endPoint: env.S3_HOST,
		port: env.S3_PORT,
		secretKey: env.S3_SECRET_KEY,
		useSSL: env.S3_PROTOCOL === "https",
	},
});

type AssetsCache = Map<string, string>;

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
	const { input, metadata } = await readCached(assetsCache, url);

	const { key } = await storage.images.upload({ prefix, input, metadata });

	const [asset] = await db
		.insert(schema.assets)
		.values({
			key,
			label,
			mimeType: metadata["content-type"],
			caption: caption === "Read more" ? null : caption,
			alt,
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

		const headerMatch = /<div[^>]+class="[^"]*ea-header[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(
			itemHtml,
		);
		const title = (headerMatch?.[1] ?? "").replaceAll(/<[^>]+>/g, "").trim();

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

/**
 * Parses WordPress HTML into content blocks, handling inline images (uploaded as
 * assets and stored as image content blocks), iframe embeds, and Easy Accordion
 * widgets. Text segments between specials become rich_text blocks. Blocks are
 * inserted in order into the given field.
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

	specials.sort((a, b) => {
		return a.index - b.index;
	});

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
						content: generateJSON(bodyHtml, [StarterKit, Image]),
					};
				}),
			});
			continue;
		}

		const doc = generateJSON(segment.content, [StarterKit, Image]);
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
					const asset = await upload(
						"images",
						assetsCache,
						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
						new URL(node.attrs.src),
						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
						node.attrs.src,
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

			case "accordion": {
				await tx
					.insert(schema.accordionContentBlocks)
					.values({ id: contentBlock.id, items: block.items });
				break;
			}

			default: {
				unreachable();
			}
		}
	}
}

async function readAssetsCacheData(): Promise<AssetsCache> {
	if (existsSync(assetsCacheFilePath)) {
		const data = await fs.readFile(assetsCacheFilePath, { encoding: "utf-8" });
		const cache = JSON.parse(data) as Array<[string, string]>;
		return new Map(cache);
	}

	await fs.mkdir(assetsCacheFolderPath, { recursive: true });

	return new Map();
}

async function writeAssetsCacheData(cache: AssetsCache): Promise<void> {
	await fs.writeFile(assetsCacheFilePath, JSON.stringify(Array.from(cache)), { encoding: "utf-8" });
}

async function getData(): Promise<WordPressData> {
	if (existsSync(cacheFilePath)) {
		const data = await fs.readFile(cacheFilePath, { encoding: "utf-8" });
		return JSON.parse(data) as WordPressData;
	}

	const data = await getWordPressData(apiBaseUrl);

	await fs.mkdir(cacheFolderPath, { recursive: true });
	await fs.writeFile(cacheFilePath, JSON.stringify(data, null, 2), { encoding: "utf-8" });

	return data;
}

interface ProjectMetadata {
	fullName: string | null;
	duration: { start: Date; end?: Date } | null;
	funding: number | null;
	topic: string | null;
	summary: string | null;
}

function parseProjectDate(s: string): Date | null {
	const m = /(\d{2})[-/](\d{2})[-/](\d{4})/.exec(s.trim());
	if (!m) {
		return null;
	}
	return new Date(Date.UTC(Number(m[3]!), Number(m[2]!) - 1, Number(m[1]!)));
}

function parseEuContribution(raw: string): number | null {
	const cleaned = raw.trim().replaceAll(/\s/g, "").replace(",", ".");
	const n = Number.parseFloat(cleaned);
	return Number.isNaN(n) || n === 0 ? null : n;
}

function extractProjectMetadata(html: string): ProjectMetadata {
	// <!--more--> can appear inside <strong> tags (e.g. IPERION CH)
	const normalized = html.replaceAll("<!--more-->", "");

	const fullNameMatch = /<strong>\s*Full project name[^<]*<\/strong>\s*(?::\s*)?([^<\n]+)/i.exec(
		normalized,
	);
	const durationMatch =
		/<strong>\s*Duration[^<]*<\/strong>\s*(?::\s*)?from\s+([\d/-]+)\s+to\s+([\d/-]+)/i.exec(
			normalized,
		);
	// eslint-disable-next-line regexp/no-super-linear-backtracking
	const euMatch = /<strong>EU Contribution<\/strong>\s*(?::\s*)?EUR\s*([\d\s,.']*\d)/i.exec(
		normalized,
	);
	const topicMatch = /<strong>Topic<\/strong>[^<]*<a[^>]+href="([^"]+)"/i.exec(normalized);
	// eslint-disable-next-line regexp/no-super-linear-backtracking
	const summaryMatch = /<strong>Summary<\/strong>\s*:\s*([\s\S]*?)(?=<\/p>)/i.exec(normalized);

	const startDate = durationMatch ? parseProjectDate(durationMatch[1]!) : null;
	const endDate = durationMatch ? parseProjectDate(durationMatch[2]!) : null;

	return {
		fullName: fullNameMatch ? fullNameMatch[1]!.trim() : null,
		duration: startDate ? { start: startDate, end: endDate ?? undefined } : null,
		funding: euMatch ? parseEuContribution(euMatch[1]!) : null,
		topic: topicMatch ? topicMatch[1]! : null,
		summary: summaryMatch ? summaryMatch[1]!.replaceAll(/<[^>]+>/g, "").trim() : null,
	};
}

function stripProjectMetaBlock(html: string): string {
	return html
		.replaceAll("<!--more-->", "")
		.replaceAll(
			/<p>\s*<strong>\s*(?:Full project name|Duration|EU Contribution|Topic|Summary|Website|Funding scheme)[^<]*<\/strong>[\s\S]*?<\/p>/gi,
			"",
		)
		.trim();
}

type PersonRoleType =
	| "national_coordinator"
	| "national_coordinator_deputy"
	| "national_representative";

function parsePositionRoles(position: string): Array<PersonRoleType> {
	const pos = position.trim();

	if (/national representative and national coordinator/i.test(pos)) {
		return ["national_representative", "national_coordinator"];
	}
	if (/^deputy national (?:co-)?coordinator/i.test(pos)) {
		return ["national_coordinator_deputy"];
	}
	if (/^national coordinator/i.test(pos)) {
		return ["national_coordinator"];
	}
	if (
		/^national representative/i.test(pos) ||
		/chair of general assembly \/ national representative/i.test(pos)
	) {
		return ["national_representative"];
	}

	return [];
}

async function main() {
	log.info("Retrieving data from wordpress...");

	const data = await getData();

	const assetsCache = await readAssetsCacheData();

	const categoriesBySlug = keyBy(Object.values(data.categories), (item) => {
		return item.slug;
	});

	const status = await db.query.entityStatus.findMany();
	const statusByType = keyBy(status, (item) => {
		return item.type;
	});

	const types = await db.query.entityTypes.findMany();
	const typesByType = keyBy(types, (item) => {
		return item.type;
	});

	const organisationalUnitTypes = await db.query.organisationalUnitTypes.findMany();
	const organisationalUnitTypesByType = keyBy(organisationalUnitTypes, (item) => {
		return item.type;
	});

	const organisationalUnitStatus = await db.query.organisationalUnitStatus.findMany();
	const organisationalUnitStatusByType = keyBy(organisationalUnitStatus, (item) => {
		return item.status;
	});

	const personRoleTypes = await db.query.personRoleTypes.findMany();
	const personRoleTypesByType = keyBy(personRoleTypes, (item) => {
		return item.type;
	});

	const wpCountryIdToOrgUnitId = new Map<number, string>();
	const wpInstitutionIdToOrgUnitId = new Map<number, string>();
	const wpWorkingGroupIdToOrgUnitId = new Map<number, string>();
	const wpPersonIdToDbId = new Map<number, string>();

	const spotlightArticleIdToAuthorNames = new Map<string, Array<string>>();
	const impactCaseStudyIdToAuthorNames = new Map<string, Array<string>>();

	const projectScopes = await db.query.projectScopes.findMany();
	const projectScopesByType = keyBy(projectScopes, (item) => {
		return item.scope;
	});

	const projectRoles = await db.query.projectRoles.findMany();
	const projectRolesByType = keyBy(projectRoles, (item) => {
		return item.role;
	});

	const contentBlockTypes = await db.query.contentBlockTypes.findMany();
	const contentBlockTypesByType = keyBy(contentBlockTypes, (item) => {
		return item.type;
	});

	const entityTypes = await db.query.entityTypes.findMany();
	const entityTypesByType = keyBy(entityTypes, (item) => {
		return item.type;
	});

	const socialMediaTypes = await db.query.socialMediaTypes.findMany();
	const socialMediaTypesByType = keyBy(socialMediaTypes, (item) => {
		return item.type;
	});

	const umbrellaUnit = await db.query.organisationalUnits.findFirst({
		where: {
			type: {
				type: "eric",
			},
		},
	});

	const placeholderImage = await upload("images", assetsCache, placeholderImageUrl, "Placeholder");
	assert(placeholderImage, "Missing placeholder image.");

	/**
	 * ============================================================================================
	 * Pages.
	 * ============================================================================================
	 */

	log.info("Migrating pages...");

	for (const page of Object.values(data.pages)) {
		if (deniedPageLinks.has(page.link)) {
			continue;
		}

		assert(page.status === "publish", "Page has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: page.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.pages.id,
					createdAt: new Date(page.date_gmt),
					updatedAt: new Date(page.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId = await uploadFeaturedImage(
				"images",
				assetsCache,
				data.media,
				page.featured_media,
				page.id,
			);

			if (imageId == null) {
				log.warn(`Missing image (page id ${String(page.id)}).`);
			}

			if (page.link.startsWith("https://www.dariah.eu/activities/impact-case-studies/")) {
				await tx.insert(schema.impactCaseStudies).values({
					id,
					title: toPlaintext(page.title.rendered),
					summary: toSummary(page.excerpt.rendered),
					imageId: imageId ?? placeholderImage.id,
					createdAt: new Date(page.date_gmt),
					updatedAt: new Date(page.modified_gmt),
				});
				const authorNames = extractAuthorsFromHtml(page.content.rendered);
				if (authorNames.length > 0) {
					impactCaseStudyIdToAuthorNames.set(id, authorNames);
				}
			} else if (page.link.startsWith("https://www.dariah.eu/activities/spotlight/")) {
				await tx.insert(schema.spotlightArticles).values({
					id,
					title: toPlaintext(page.title.rendered),
					summary: toSummary(page.excerpt.rendered),
					imageId: imageId ?? placeholderImage.id,
					createdAt: new Date(page.date_gmt),
					updatedAt: new Date(page.modified_gmt),
				});
				const authorNames = extractAuthorsFromHtml(page.content.rendered);
				if (authorNames.length > 0) {
					spotlightArticleIdToAuthorNames.set(id, authorNames);
				}
			} else {
				await tx.insert(schema.pages).values({
					id,
					title: toPlaintext(page.title.rendered),
					summary: toSummary(page.excerpt.rendered),
					imageId,
					createdAt: new Date(page.date_gmt),
					updatedAt: new Date(page.modified_gmt),
				});
			}

			if (page.content.rendered.trim().length === 0) {
				return;
			}

			const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.pages.id,
					fieldName: "content",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			await migrateHtmlContent(
				tx,
				page.content.rendered,
				assetsCache,
				field.id,
				contentBlockTypesByType,
			);
		});
	}

	/**
	 * ============================================================================================
	 * Documents and policies.
	 * ============================================================================================
	 */

	const documents = [
		{
			group: "DARIAH ERIC Statutes",
			items: [
				{
					title: "DARIAH ERIC Statutes February 2026",
					href: "https://www.dariah.eu/wp-content/uploads/2026/02/DARIAH-ERIC-Statutes-Version-February-2026.pdf",
					image: null,
					description: null,
					doi: null,
				},
				{
					title: "Internal Rules of Procedure and Policies December 2024",
					href: "https://www.dariah.eu/wp-content/uploads/2024/12/IRP-Version-December-2024.pdf",
					image: null,
					description: null,
					doi: null,
				},
			],
		},
		{
			group: "DARIAH Strategic Plan and DARIAH Strategic Action Plans",
			items: [
				{
					title: "DARIAH Strategic Plan 2019-2026",
					href: "https://www.dariah.eu/wp-content/uploads/2019/08/Strategic-Plan_2019-2026.pdf",
					image:
						"https://www.dariah.eu/wp-content/uploads/2019/09/Strategic-Plan-1-e1568200777643.png",
					description: null,
					doi: null,
				},
				{
					title: "DARIAH Strategic Action Plan II 2019-2022",
					href: "https://www.dariah.eu/wp-content/uploads/2020/05/DARIAH-Strategic-Action-Plan-II-2019-2022.pdf",
					image: null,
					description: null,
					doi: null,
				},
				{
					title: "DARIAH Strategic Action Plan III 2022-2025",
					href: "https://www.dariah.eu/wp-content/uploads/2022/07/DARIAH-Strategic-Action-Plan-III-2022-2025-final.pdf",
					image: null,
					description: null,
					doi: null,
				},
			],
		},
		{
			group: "DARIAH goes Green: Internal Environmental Guidelines",
			items: [
				{
					title: "DARIAH goes Green: Internal Environmental Guidelines",
					href: "https://www.dariah.eu/wp-content/uploads/2025/09/DARIAH-Goes-Green_-Internal-Environmental-Guidelines_01.pdf",
					image: null,
					description: null,
					doi: null,
				},
			],
		},
		{
			group: "DARIAH Gender Equality Plan",
			items: [
				{
					title: "DARIAH Gender Equality Plan 2022",
					href: "https://www.dariah.eu/wp-content/uploads/2022/06/Gender-Equality-Plan_final.pdf",
					image: null,
					description: null,
					doi: null,
				},
			],
		},
		{
			group: "DARIAH Annual Event Code of Conduct",
			items: [
				{
					title: "DARIAH Annual Event Code of Conduct 2025",
					href: "https://www.dariah.eu/wp-content/uploads/2025/04/DARIAH-Annual-Event-Code-of-Conduct.pdf",
					image: null,
					description: null,
					doi: null,
				},
			],
		},
		{
			group: "Selected DARIAH ERIC reports",
			items: [
				{
					title: "Annual Report 2024",
					href: "https://www.dariah.eu/wp-content/uploads/2026/03/DARIAH-Annual-Report-2024.pdf",
					image: "https://www.dariah.eu/wp-content/uploads/2026/03/AR2024_Cover_1.png",
					description:
						"Cite as: Digital Research Infrastructure for the Arts and Humanities. (2025). DARIAH-EU Annual Report 2024. Zenodo.",
					doi: "https://doi.org/10.5281/zenodo.18846153",
				},
				{
					title: "Annual Report 2023",
					href: "https://www.dariah.eu/wp-content/uploads/2024/10/TCD-DARIAH-Annual-Report-2023.pdf",
					image: "https://www.dariah.eu/wp-content/uploads/2024/10/Annual-Report-2023_cover.png",
					description:
						"Cite as: Digital Research Infrastructure for the Arts and Humanities. (2024). DARIAH-EU Annual Report 2023. Zenodo.",
					doi: "https://doi.org/10.5281/zenodo.14007767",
				},
				{
					title: "Annual Report 2022",
					href: "https://www.dariah.eu/wp-content/uploads/2023/12/DARIAH-Annual-Report-2022.pdf",
					description:
						"Cite as: Digital Research Infrastructure for the Arts and Humanities. (2023). DARIAH-EU Annual Report 2022. Zenodo.",
					doi: "https://doi.org/10.5281/zenodo.13740997",
					image:
						"https://www.dariah.eu/wp-content/uploads/2023/12/DARIAH-AR-2022-e1702306350513.png",
				},
				{
					title: "Annual Report 2021",
					href: "https://www.dariah.eu/wp-content/uploads/2022/08/DARIAH-AR-2021-FINAL_2.pdf",
					description:
						"Cite as: Digital Research Infrastructure for the Arts and Humanities. (2022). DARIAH-EU Annual Report 2021. Zenodo.",
					doi: "https://doi.org/10.5281/zenodo.13740981",
					image: "https://www.dariah.eu/wp-content/uploads/2022/07/Annual-Report-2021_cover.jpg",
				},
				{
					title: "Annual Report 2020",
					href: "https://www.dariah.eu/wp-content/uploads/2021/06/DARIAH-EU-AnnualReport-2020.pdf",
					description:
						"Cite as: Digital Research Infrastructure for the Arts and Humanities. (2021). DARIAH-EU Annual Report 2020. Zenodo.",
					doi: "https://doi.org/10.5281/zenodo.13740975",
					image: "https://www.dariah.eu/wp-content/uploads/2021/06/AR2020_cover.png",
				},
				{
					title: "Annual Report 2019",
					href: "https://www.dariah.eu/wp-content/uploads/2020/07/DARIAH-annual-report-2019_v2.pdf",
					description:
						"Cite as: Digital Research Infrastructure for the Arts and Humanities. (2020). DARIAH-EU Annual Report 2019. Zenodo.",
					doi: "https://doi.org/10.5281/zenodo.13740965",
					image: "https://www.dariah.eu/wp-content/uploads/2020/05/Annual-Report-2019_cover.png",
				},
				{
					title: "Annual Report 2018",
					href: "https://www.dariah.eu/wp-content/uploads/2019/07/DARIAH_Annual_Report_2018.pdf",
					description:
						"Cite as: Digital Research Infrastructure for the Arts and Humanities. (2019). DARIAH-EU Annual Report 2018. Zenodo",
					doi: "https://doi.org/10.5281/zenodo.13740958",
					image:
						"https://www.dariah.eu/wp-content/uploads/2019/07/DARIAH_Annual_Report_2018-1_thumbail-1.jpg",
				},
				{
					title: "Annual Report 2017",
					href: "https://www.dariah.eu/wp-content/uploads/2018/12/DARIAH-Annual-Report-2017.pdf",
					description:
						"Cite as: Digital Research Infrastructure for the Arts and Humanities. (2018). DARIAH-EU Annual Report 2017. Zenodo.",
					doi: "https://doi.org/10.5281/zenodo.13740942",
					image:
						"https://www.dariah.eu/wp-content/uploads/2019/07/DARIAH-Annual-Report-2017_thumbnail.jpg",
				},
				{
					title: "Annual Report 2016",
					href: "https://www.dariah.eu/wp-content/uploads/2018/02/Dariah_Annual_Report_2016.pdf",
					description:
						"Cite as: Digital Research Infrastructure for the Arts and Humanities. (2017). DARIAH-EU Annual Report 2016. Zenodo.",
					doi: "https://doi.org/10.5281/zenodo.13740933",
					image:
						"https://www.dariah.eu/wp-content/uploads/2019/07/Dariah_Annual_Report_2016_thumbnail.jpg",
				},
				{
					title: "Annual Report 2015",
					href: "https://www.dariah.eu/wp-content/uploads/2017/02/2015_DARIAH_annual_report1.pdf",
					description:
						"Cite as: Digital Research Infrastructure for the Arts and Humanities. (2016). DARIAH-EU Annual Report 2015. Zenodo.",
					doi: "https://doi.org/10.5281/zenodo.13740902",
					image:
						"https://www.dariah.eu/wp-content/uploads/2019/07/2015_DARIAH_annual_report1_thumbnail.jpg",
				},
				{
					title: "Annual Report 2013",
					href: "https://www.dariah.eu/wp-content/uploads/2017/02/DARIAH-EU_Annual_report_2013.pdf",
					description:
						"Cite as: Digital Research Infrastructure for the Arts and Humanities. (2014). DARIAH-EU Annual Report 2013. Zenodo.",
					doi: "https://doi.org/10.5281/zenodo.13740884",
					image: null,
				},
				{
					title: "Annual Report 2012",
					href: "https://www.dariah.eu/wp-content/uploads/2017/02/DARIAH-EU_Annual_report_2012.pdf",
					description:
						"Cite as: Digital Research Infrastructure for the Arts and Humanities. (2013). DARIAH-EU Annual Report 2012. Zenodo.",
					doi: "https://doi.org/10.5281/zenodo.13736791",
					image: null,
				},
				{
					title: "Annual Report 2011",
					href: "https://www.dariah.eu/wp-content/uploads/2017/02/DARIAH-EU_Annual_report_2011.pdf",
					description:
						"Cite as: Digital Research Infrastructure for the Arts and Humanities. (2012). DARIAH-EU Annual Report 2011. Zenodo.",
					doi: "https://doi.org/10.5281/zenodo.13736811",
					image: null,
				},
			],
		},
		{
			group: "DARIAH Working Groups Policy Statement",
			items: [
				{
					title: "Working Groups Policy Statement",
					href: "https://www.dariah.eu/wp-content/uploads/2019/09/DARIAH-Working-Groups-Policy-Statement_v5.pdf",
					image:
						"https://www.dariah.eu/wp-content/uploads/2019/09/WG-Policy-Doc-e1568885895474.jpg",
					description: null,
					doi: null,
				},
				{
					title: "Introduction to the DARIAH Working Groups",
					href: "https://www.dariah.eu/wp-content/uploads/2019/09/DARIAH-Working-Groups-2.pdf",
					image:
						"https://www.dariah.eu/wp-content/uploads/2019/09/DARIAH-Working-Groups_intro-e1568887589582.png",
					description: null,
					doi: null,
				},
			],
		},
		{
			group: "Cooperating Partners documents",
			items: [
				{
					title: "Template application form for European Cooperating Partner",
					href: "https://www.dariah.eu/wp-content/uploads/2021/01/EU-CP-Template-application-letter-DARIAH.pdf",
					description: null,
					image: null,
					doi: null,
				},
				{
					title: "Template application form for non-European Cooperating Partner",
					href: "https://www.dariah.eu/wp-content/uploads/2021/01/NON-EU-CP-Template-application-letter-DARIAH.pdf",
					description: null,
					image: null,
					doi: null,
				},
				{
					title: "Template European Cooperating Partner agreement",
					href: "https://www.dariah.eu/wp-content/uploads/2020/12/EU-CP-Binding-Agreement_MASTER-COPY.pdf",
					description: null,
					image: null,
					doi: null,
				},
				{
					title: "Template non-European Cooperating Partner agreement",
					href: "https://www.dariah.eu/wp-content/uploads/2020/12/NON-EU-CP-Binding-Agreement_MASTER-COPY.pdf",
					description: null,
					image: null,
					doi: null,
				},
				{
					title: "Benefits and requirements for becoming a DARIAH Cooperating Partner",
					href: "https://www.dariah.eu/wp-content/uploads/2020/12/DARIAH-CP-Factsheet.pdf",
					image: "https://www.dariah.eu/wp-content/uploads/2020/12/DARIAH-Infographics_2-.png",
					description: null,
					doi: null,
				},
			],
		},
		{
			group: "European Commission documents",
			items: [
				{
					title: "Riding the wave. How Europe can gain from the rising tide of scientific data",
					href: "https://www.dariah.eu/wp-content/uploads/2017/02/hlg-sdi-report.pdf",
					description: null,
					image: null,
					doi: null,
				},
				{
					title:
						"European Research Infrastructures with Global Impact (Description of DARIAH, p.9)",
					href: "https://www.dariah.eu/wp-content/uploads/2017/02/ESFRI_Brochure_210912_lowres.pdf",
					description: null,
					image: null,
					doi: null,
				},
			],
		},
		{
			group: "DARIAH Logos",
			items: [
				{
					title: "DARIAH-EU Logos",
					href: "https://www.dariah.eu/wp-content/uploads/2018/02/dariah-eu_logos.zip",
					description: null,
					image: null,
					doi: null,
				},
				{
					title: "DARIAH Open Science Logos",
					href: "https://www.dariah.eu/wp-content/uploads/2018/02/DARIAH_OpenScience_logos.zip",
					description: null,
					image: null,
					doi: null,
				},
			],
		},
		{
			group: "DARIAH Style Guide",
			items: [
				{
					title: "DARIAH-EU Style guide",
					href: "https://www.dariah.eu/wp-content/uploads/2018/02/styleguide_dariaheu.pdf",
					description: null,
					image: null,
					doi: null,
				},
			],
		},
		{
			group: "Reimbursement of travel costs",
			items: [
				{
					title: "Guidelines for the reimbursement of travel costs",
					href: "https://www.dariah.eu/wp-content/uploads/2023/06/Guidelines-travel-claim_DARIAH_20230401-final.pdf",
					description: null,
					image: null,
					doi: null,
				},
				{
					title: "Travel claim form",
					href: "https://www.dariah.eu/wp-content/uploads/2023/06/DARIAH-travel-claim-form-2023.xlsx",
					description: null,
					image: null,
					doi: null,
				},
			],
		},
	];

	for (const { group: _, items } of documents) {
		for (const item of items) {
			await db.transaction(async (tx) => {
				const [entity] = await tx
					.insert(schema.entities)
					.values({
						slug: slugify(item.title),
						statusId: statusByType.published.id,
						typeId: typesByType.documents_policies.id,
					})
					.returning({ id: schema.entities.id });

				assert(entity);

				const id = entity.id;

				const response = await fetch(item.href);
				const mimeType = response.headers.get("content-type") ?? "application/octet-stream";
				const input = await response.arrayBuffer();
				const { key } = await storage.images.upload({
					prefix: "documents",
					input: Buffer.from(input),
					metadata: { "content-type": mimeType },
				});

				const [asset] = await tx
					.insert(schema.assets)
					.values({
						label: item.title,
						mimeType,
						key,
					})
					.returning({ id: schema.assets.id });

				assert(asset);

				await tx.insert(schema.documentsPolicies).values({
					title: item.title,
					summary: item.description ?? "",
					url: item.doi ?? "",
					documentId: asset.id,
					id,
				});
			});
		}
	}

	/**
	 * ============================================================================================
	 * Initiatives.
	 * ============================================================================================
	 */

	log.info("Migrating initiatives...");

	for (const page of Object.values(data.initiatives)) {
		assert(page.status === "publish", "Initiative has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: page.slug,
					statusId: statusByType.draft.id,
					typeId: typesByType.pages.id,
					createdAt: new Date(page.date_gmt),
					updatedAt: new Date(page.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId = await uploadFeaturedImage(
				"images",
				assetsCache,
				data.media,
				page.featured_media,
				page.id,
			);

			if (imageId == null) {
				log.warn(`Missing image (initiative id ${String(page.id)}).`);
			}

			await tx.insert(schema.pages).values({
				id,
				title: toPlaintext(page.title.rendered),
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				summary: toSummary(page.excerpt?.rendered ?? ""),
				imageId,
				createdAt: new Date(page.date_gmt),
				updatedAt: new Date(page.modified_gmt),
			});

			if (page.content.rendered.trim().length === 0) {
				return;
			}

			const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.pages.id,
					fieldName: "content",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			await migrateHtmlContent(
				tx,
				page.content.rendered,
				assetsCache,
				field.id,
				contentBlockTypesByType,
			);
		});
	}

	/**
	 * ============================================================================================
	 * News.
	 * ============================================================================================
	 */

	log.info("Migrating news...");

	const news = categoriesBySlug.news?.id;
	assert(news, "Missing news category.");

	for (const post of Object.values(data.posts)) {
		if (post.categories == null) {
			continue;
		}
		if (!post.categories.includes(news)) {
			continue;
		}

		assert(post.status === "publish", "News item has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: post.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.news.id,
					createdAt: new Date(post.date_gmt),
					updatedAt: new Date(post.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId = await uploadFeaturedImage(
				"images",
				assetsCache,
				data.media,
				post.featured_media,
				post.id,
			);

			if (imageId == null) {
				log.warn(`Missing image (news id ${String(post.id)}).`);
			}

			await tx.insert(schema.news).values({
				id,
				title: toPlaintext(post.title.rendered),
				summary: toSummary(post.excerpt.rendered),
				imageId: imageId ?? placeholderImage.id,
				createdAt: new Date(post.date_gmt),
				updatedAt: new Date(post.modified_gmt),
			});

			if (post.content.rendered.trim().length === 0) {
				return;
			}

			const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.news.id,
					fieldName: "content",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			await migrateHtmlContent(
				tx,
				post.content.rendered,
				assetsCache,
				field.id,
				contentBlockTypesByType,
			);
		});
	}

	/**
	 * ============================================================================================
	 * Events.
	 * ============================================================================================
	 */

	log.info("Migrating events...");

	for (const event of Object.values(data.events)) {
		assert(event.status === "publish", "Event has not been published.");
		assert(event.utc_start_date, "Event has no start date");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: event.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.news.id,
					createdAt: new Date(event.date_utc),
					updatedAt: new Date(event.modified_utc),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId =
				event.image !== false
					? await uploadFeaturedImage("images", assetsCache, data.media, event.image.id, event.id)
					: null;

			if (imageId == null) {
				log.warn(`Missing image (event id ${String(event.id)}).`);
			}

			await tx.insert(schema.events).values({
				id,
				title: toPlaintext(event.title),
				summary: toSummary(event.description),
				imageId: imageId ?? placeholderImage.id,
				website: event.website,
				location:
					Array.isArray(event.venue) && event.venue.length === 0
						? ""
						: [event.venue.venue, event.venue.country].filter(isNonEmptyString).join(", "),
				duration: {
					start: new Date(event.utc_start_date),
					end: isNonEmptyString(event.utc_end_date) ? new Date(event.utc_end_date) : undefined,
				},
				isFullDay: event.all_day,
				createdAt: new Date(event.date_utc),
				updatedAt: new Date(event.modified_utc),
			});

			if (event.description.trim().length === 0) {
				return;
			}

			const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.events.id,
					fieldName: "content",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			await migrateHtmlContent(
				tx,
				event.description,
				assetsCache,
				field.id,
				contentBlockTypesByType,
			);
		});
	}

	/**
	 * ============================================================================================
	 * Countries.
	 * ============================================================================================
	 */

	log.info("Migrating countries...");

	for (const country of Object.values(data.countries)) {
		assert(country.status === "publish", "Country has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: country.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.organisational_units.id,
					createdAt: new Date(country.date_gmt),
					updatedAt: new Date(country.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId = await uploadFeaturedImage(
				"logos",
				assetsCache,
				data.media,
				country.featured_media,
				country.id,
			);

			if (imageId == null) {
				log.warn(`Missing image (country id ${String(country.id)}).`);
			}

			const name = toPlaintext(country.title.rendered);

			const [orgUnit] = await tx
				.insert(schema.organisationalUnits)
				.values({
					id,
					name,
					summary: "",
					imageId: imageId ?? placeholderImage.id,
					typeId: organisationalUnitTypesByType.country.id,
					createdAt: new Date(country.date_gmt),
					updatedAt: new Date(country.modified_gmt),
				})
				.returning({ id: schema.organisationalUnits.id });

			assert(orgUnit);

			wpCountryIdToOrgUnitId.set(country.id, orgUnit.id);

			if (umbrellaUnit) {
				const isMember = country.status_terms.some((term) => {
					return term.slug === "members";
				});

				if (isMember) {
					await tx.insert(schema.organisationalUnitsRelations).values({
						unitId: orgUnit.id,
						relatedUnitId: umbrellaUnit.id,
						duration: { start: new Date(Date.UTC(1900, 0, 1)) }, // FIXME:
						status: organisationalUnitStatusByType.is_member_of.id,
					});
				}
			}

			if (isNonEmptyString(country.website)) {
				const [sm] = await tx
					.insert(schema.socialMedia)
					.values({
						name: `${name} website`,
						typeId: socialMediaTypesByType.website.id,
						url: country.website,
					})
					.returning({ id: schema.socialMedia.id });

				assert(sm);

				await tx.insert(schema.organisationalUnitsToSocialMedia).values({
					organisationalUnitId: orgUnit.id,
					socialMediaId: sm.id,
				});
			}

			// TODO: repPersons_data
			// TODO: coordinators_data
			// TODO: repInstitutions_data

			if (country.content.rendered.trim().length === 0) {
				return;
			}

			const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.organisational_units.id,
					fieldName: "description",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			await migrateHtmlContent(
				tx,
				country.content.rendered,
				assetsCache,
				field.id,
				contentBlockTypesByType,
			);
		});
	}

	/**
	 * ============================================================================================
	 * Institution.
	 * ============================================================================================
	 */

	log.info("Migrating institutions...");

	for (const institution of Object.values(data.institutions)) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		assert(institution.status === "publish", "Institution has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: institution.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.organisational_units.id,
					createdAt: new Date(institution.date_gmt),
					updatedAt: new Date(institution.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId = await uploadFeaturedImage(
				"logos",
				assetsCache,
				data.media,
				institution.featured_media,
				institution.id,
			);

			const name = toPlaintext(institution.title.rendered);

			// Role IDs from https://www.dariah.eu/wp-json/wp/v2/dariah_institution_country_role:
			// 14 = national-coordinating-institution
			// 15 = partner-institutions
			// 20 = cooperating-partners
			// 112 = other
			const isNationalCoordinator = institution.dariah_institution_country_role.includes(14);
			const isPartnerInstitution = institution.dariah_institution_country_role.includes(15);
			const isCooperatingPartner = institution.dariah_institution_country_role.includes(20);

			const [orgUnit] = await tx
				.insert(schema.organisationalUnits)
				.values({
					id,
					name,
					summary: "",
					typeId: organisationalUnitTypesByType.institution.id,
					imageId: imageId ?? placeholderImage.id,
					createdAt: new Date(institution.date_gmt),
					updatedAt: new Date(institution.modified_gmt),
				})
				.returning({ id: schema.organisationalUnits.id });

			assert(orgUnit);

			wpInstitutionIdToOrgUnitId.set(institution.id, orgUnit.id);

			// WP institutions with missing country_data, manually assigned:
			// 392 = Gottfried Wilhelm Leibniz University of Hannover → Germany (287)
			// 574 = Max Planck Institute for Social Law and Social Policy → Germany (287)
			const countryWpId =
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				institution.country_data?.id ??
				(institution.id === 392 || institution.id === 574 ? 287 : undefined);

			const countryOrgUnitId =
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				countryWpId != null ? wpCountryIdToOrgUnitId.get(countryWpId) : undefined;

			if (countryOrgUnitId != null) {
				await tx.insert(schema.organisationalUnitsRelations).values({
					unitId: orgUnit.id,
					relatedUnitId: countryOrgUnitId,
					duration: { start: new Date(Date.UTC(1900, 0, 1)) }, // FIXME:

					status: organisationalUnitStatusByType.is_located_in.id,
				});
			}

			if (isNationalCoordinator && umbrellaUnit != null) {
				await tx.insert(schema.organisationalUnitsRelations).values({
					unitId: orgUnit.id,
					relatedUnitId: umbrellaUnit.id,
					duration: { start: new Date(Date.UTC(1900, 0, 1)) }, // FIXME:

					status: organisationalUnitStatusByType.is_national_coordinating_institution_in.id,
				});
			}

			if (isPartnerInstitution && countryOrgUnitId != null && umbrellaUnit != null) {
				await tx.insert(schema.organisationalUnitsRelations).values({
					unitId: orgUnit.id,
					relatedUnitId: umbrellaUnit.id,
					duration: { start: new Date(Date.UTC(1900, 0, 1)) }, // FIXME:

					status: organisationalUnitStatusByType.is_partner_institution_of.id,
				});
			}

			if (isCooperatingPartner && countryOrgUnitId != null && umbrellaUnit != null) {
				await tx.insert(schema.organisationalUnitsRelations).values({
					unitId: orgUnit.id,
					relatedUnitId: umbrellaUnit.id,
					duration: { start: new Date(Date.UTC(1900, 0, 1)) }, // FIXME:

					status: organisationalUnitStatusByType.is_cooperating_partner_of.id,
				});
			}

			if (isNonEmptyString(institution.website)) {
				const [sm] = await tx
					.insert(schema.socialMedia)
					.values({
						name: `${name} website`,
						typeId: socialMediaTypesByType.website.id,
						url: institution.website,
					})
					.returning({ id: schema.socialMedia.id });

				assert(sm);

				await tx.insert(schema.organisationalUnitsToSocialMedia).values({
					organisationalUnitId: orgUnit.id,
					socialMediaId: sm.id,
				});
			}

			if (institution.content.rendered.trim().length === 0) {
				return;
			}

			const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.organisational_units.id,
					fieldName: "description",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			await migrateHtmlContent(
				tx,
				institution.content.rendered,
				assetsCache,
				field.id,
				contentBlockTypesByType,
			);
		});
	}

	/**
	 * ============================================================================================
	 * National representative institution relations.
	 * ============================================================================================
	 */

	log.info("Creating national representative institution relations...");

	for (const country of Object.values(data.countries)) {
		const countryOrgUnitId = wpCountryIdToOrgUnitId.get(country.id);
		if (countryOrgUnitId == null) {
			continue;
		}

		// Deduplicate: multiple persons from the same institution may be listed
		const repInstitutionWpIds = new Set(
			country.repPersons_data.map((p) => {
				return p.institution;
			}),
		);

		for (const wpInstId of repInstitutionWpIds) {
			const institutionOrgUnitId = wpInstitutionIdToOrgUnitId.get(wpInstId);
			if (institutionOrgUnitId == null) {
				continue;
			}

			if (umbrellaUnit == null) {
				continue;
			}

			await db.insert(schema.organisationalUnitsRelations).values({
				unitId: institutionOrgUnitId,
				relatedUnitId: umbrellaUnit.id,
				duration: { start: new Date(Date.UTC(1900, 0, 1)) }, // FIXME:
				status: organisationalUnitStatusByType.is_national_representative_institution_in.id,
			});
		}
	}

	/**
	 * ============================================================================================
	 * Working group.
	 * ============================================================================================
	 */

	log.info("Migrating working groups...");

	for (const workingGroup of Object.values(data.workingGroups)) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		assert(workingGroup.status === "publish", "Working group has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: workingGroup.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.organisational_units.id,
					createdAt: new Date(workingGroup.date_gmt),
					updatedAt: new Date(workingGroup.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId = await uploadFeaturedImage(
				"logos",
				assetsCache,
				data.media,
				workingGroup.featured_media,
				workingGroup.id,
			);

			const [orgUnit] = await tx
				.insert(schema.organisationalUnits)
				.values({
					id,
					name: toPlaintext(workingGroup.title.rendered),
					summary: "",
					typeId: organisationalUnitTypesByType.working_group.id,
					imageId: imageId ?? placeholderImage.id,
					createdAt: new Date(workingGroup.date_gmt),
					updatedAt: new Date(workingGroup.modified_gmt),
				})
				.returning({ id: schema.organisationalUnits.id });

			assert(orgUnit);

			wpWorkingGroupIdToOrgUnitId.set(workingGroup.id, orgUnit.id);

			if (umbrellaUnit) {
				await tx.insert(schema.organisationalUnitsRelations).values({
					unitId: orgUnit.id,
					relatedUnitId: umbrellaUnit.id,
					duration: { start: new Date(Date.UTC(1900, 0, 1)) }, // FIXME:
					status: organisationalUnitStatusByType.is_part_of.id,
				});
			}

			if (workingGroup.content.rendered.trim().length === 0) {
				return;
			}

			const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.organisational_units.id,
					fieldName: "description",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			await migrateHtmlContent(
				tx,
				workingGroup.content.rendered,
				assetsCache,
				field.id,
				contentBlockTypesByType,
			);
		});
	}

	/**
	 * ============================================================================================
	 * Projects.
	 * ============================================================================================
	 */

	log.info("Migrating projects...");

	for (const project of Object.values(data.projects)) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		assert(project.status === "publish", "Project has not been published.");

		const meta = extractProjectMetadata(project.content.rendered);

		if (meta.duration == null) {
			log.warn(
				`Project ${String(project.id)} ("${project.title.rendered}"): could not extract duration from HTML.`,
			);
		}

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: project.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.projects.id,
					createdAt: new Date(project.date_gmt),
					updatedAt: new Date(project.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId = await uploadFeaturedImage(
				"logos",
				assetsCache,
				data.media,
				project.featured_media,
				project.id,
			);

			// Prefer HTML-extracted full name over WP fullname field (WP data has known
			// corruptions, e.g. HIRMEOS has PARTHENOS's fullname). Fall back to title.
			const name = meta.fullName ?? (project.fullname || project.title.rendered);
			const summary =
				(meta.summary ?? toSummary(project.excerpt.rendered)) || project.title.rendered;

			const [p] = await tx
				.insert(schema.projects)
				.values({
					id,
					name,
					acronym: project.title.rendered,
					duration: meta.duration ?? {
						start: new Date(Date.UTC(1900, 0, 1)),
						end: new Date(Date.UTC(1900, 0, 1)),
					}, // FIXME: manual fix needed
					funding: meta.funding,
					summary,
					topic: meta.topic,
					imageId: imageId ?? placeholderImage.id,
					scopeId: projectScopesByType.national.id, // FIXME: manual fix needed
					createdAt: new Date(project.date_gmt),
					updatedAt: new Date(project.modified_gmt),
				})
				.returning({ id: schema.projects.id });

			assert(p);

			if (umbrellaUnit) {
				await tx.insert(schema.projectsToOrganisationalUnits).values({
					projectId: p.id,
					unitId: umbrellaUnit.id,
					roleId: projectRolesByType.participant.id,
				});
			}

			if (isNonEmptyString(project.website)) {
				const [sm] = await tx
					.insert(schema.socialMedia)
					.values({
						name: `${name} website`,
						typeId: socialMediaTypesByType.website.id,
						url: project.website,
					})
					.returning({ id: schema.socialMedia.id });

				assert(sm);

				await tx.insert(schema.projectsToSocialMedia).values({
					projectId: p.id,
					socialMediaId: sm.id,
				});
			}

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (project.relations.coordinator != null) {
				const coordinatorOrgUnitId = wpInstitutionIdToOrgUnitId.get(
					project.relations.coordinator.id,
				);
				if (coordinatorOrgUnitId != null) {
					await tx.insert(schema.projectsToOrganisationalUnits).values({
						projectId: p.id,
						unitId: coordinatorOrgUnitId,
						roleId: projectRolesByType.coordinator.id,
					});
				}
			}

			const participantWpIds = new Set(
				project.relations.institutions
					.map((i) => {
						return i.id;
					})
					.filter((id) => {
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
						return id !== project.relations.coordinator?.id;
					}),
			);

			for (const wpInstId of participantWpIds) {
				const unitId = wpInstitutionIdToOrgUnitId.get(wpInstId);
				if (unitId != null) {
					await tx.insert(schema.projectsToOrganisationalUnits).values({
						projectId: p.id,
						unitId,
						roleId: projectRolesByType.participant.id,
					});
				}
			}

			const contentHtml = stripProjectMetaBlock(project.content.rendered);

			if (contentHtml.length === 0) {
				return;
			}

			const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.projects.id,
					fieldName: "description",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			await migrateHtmlContent(tx, contentHtml, assetsCache, field.id, contentBlockTypesByType);
		});
	}

	/**
	 * ============================================================================================
	 * Person.
	 * ============================================================================================
	 */

	log.info("Migrating people...");

	// Hardcoded persons which dont exist in dariah_person collection, but are referenced as authors
	// in spotlights or impact-case-studies.
	const authors = [
		{ name: "Mengdi Zhang", sortName: "Zhang, Mengdi" },
		{ name: "Canan Hastik", sortName: "Hastik, Canan" },
		{ name: "Christof Schöch", sortName: "Schöch, Christof" },
		{ name: "Colter Wehmeier", sortName: "Wehmeier, Colter" },
		{ name: "Gaia Redaelli", sortName: "Redaelli, Gaia" },
		{ name: "Inés Matres", sortName: "Matres, Inés" },
		{ name: "Jouni Tuominen", sortName: "Tuominen, Jouni" },
		{ name: "Loup Bernard", sortName: "Bernard, Loup" },
		{ name: "Luise Borek", sortName: "Borek, Luise" },
		{ name: "Maciej Eder", sortName: "Eder, Maciej" },
		{ name: "Mikko Tolonen", sortName: "Tolonen, Mikko" },
		{ name: "Natalia Ermolaev", sortName: "Ermolaev, Natalia" },
	];

	for (const person of authors) {
		await db.transaction(async (tx) => {
			const slug = slugify(person.name);

			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug,
					statusId: statusByType.published.id,
					typeId: typesByType.persons.id,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			await tx.insert(schema.persons).values({
				id,
				name: person.name,
				sortName: person.sortName,
				// email: person.email,
				// position: person.position,
				// orcid,
				imageId: placeholderImage.id,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		});
	}

	for (const person of Object.values(data.people)) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		assert(person.status === "publish", "Person has not been published.");

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: person.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.persons.id,
					createdAt: new Date(person.date_gmt),
					updatedAt: new Date(person.modified_gmt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const imageId = await uploadFeaturedImage(
				"avatars",
				assetsCache,
				data.media,
				person.featured_media,
				person.id,
			);

			if (imageId == null) {
				log.warn(`Missing image (person id ${String(person.id)}).`);
			}

			await tx.insert(schema.persons).values({
				id,
				name: [person.firstname, person.lastname].filter(Boolean).join(" "),
				sortName: [person.lastname, person.firstname].filter(Boolean).join(", "),
				email: person.email,
				position: person.position,
				// orcid,
				imageId: imageId ?? placeholderImage.id,
				createdAt: new Date(person.date_gmt),
				updatedAt: new Date(person.modified_gmt),
			});

			wpPersonIdToDbId.set(person.id, id);

			// TODO: website
			// TODO: identifiant
			// TODO: twitter
			// TODO: skills
			// TODO: research

			const roles = parsePositionRoles(person.position);

			if (roles.length > 0) {
				if (person.institution_data != null) {
					const institution = data.institutions[person.institution_data.id];
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					const countryWpId = institution?.country_data?.id;
					const countryOrgUnitId =
						countryWpId != null ? wpCountryIdToOrgUnitId.get(countryWpId) : undefined;

					if (countryOrgUnitId != null) {
						for (const role of roles) {
							await tx.insert(schema.personsToOrganisationalUnits).values({
								personId: id,
								organisationalUnitId: countryOrgUnitId,
								roleTypeId: personRoleTypesByType[role].id,
								duration: { start: new Date(Date.UTC(1900, 0, 1)) }, // FIXME:
							});
						}
					} else {
						log.warn(
							`Person ${String(person.id)} ("${person.position}"): could not resolve country for institution ${String(person.institution_data.id)}.`,
						);
					}
				} else {
					log.warn(
						`Person ${String(person.id)} ("${person.position}"): no institution_data, skipping role relation.`,
					);
				}
			}

			if (person.content.rendered.trim().length === 0) {
				return;
			}

			const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.persons.id,
					fieldName: "biography",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			await migrateHtmlContent(
				tx,
				person.content.rendered,
				assetsCache,
				field.id,
				contentBlockTypesByType,
			);
		});
	}

	/**
	 * ============================================================================================
	 * Working group chair relations.
	 * ============================================================================================
	 */

	log.info("Creating working group chair relations...");

	for (const workingGroup of Object.values(data.workingGroups)) {
		const workingGroupOrgUnitId = wpWorkingGroupIdToOrgUnitId.get(workingGroup.id);
		if (workingGroupOrgUnitId == null) {
			continue;
		}

		const leaderWpIds = new Set(
			workingGroup.leaders_data.map((l) => {
				return l.id;
			}),
		);

		for (const wpPersonId of leaderWpIds) {
			const personDbId = wpPersonIdToDbId.get(wpPersonId);
			if (personDbId == null) {
				log.warn(
					`Working group ${String(workingGroup.id)}: leader person ${String(wpPersonId)} not found.`,
				);
				continue;
			}

			await db.insert(schema.personsToOrganisationalUnits).values({
				personId: personDbId,
				organisationalUnitId: workingGroupOrgUnitId,
				roleTypeId: personRoleTypesByType.is_chair_of.id,
				duration: { start: new Date(Date.UTC(1900, 0, 1)) }, // FIXME:
			});
		}
	}

	//

	/**
	 * ============================================================================================
	 * Author relations for spotlight articles and impact case studies.
	 * ============================================================================================
	 */

	log.info("Creating author relations for spotlight articles and impact case studies...");

	const personsByName = new Map<string, string>();
	for (const person of Object.values(data.people)) {
		const fullName = [person.firstname, person.lastname].filter(Boolean).join(" ");
		const dbId = wpPersonIdToDbId.get(person.id);
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		if (fullName && dbId) {
			personsByName.set(fullName, dbId);
		}
	}

	function resolvePersonByName(authorName: string): string | undefined {
		const exact = personsByName.get(authorName);
		if (exact != null) {
			return exact;
		}
		for (const [name, dbId] of personsByName) {
			if (authorName.includes(name)) {
				return dbId;
			}
		}
		return undefined;
	}

	for (const [articleId, authorNames] of spotlightArticleIdToAuthorNames) {
		for (const authorName of authorNames) {
			const personDbId = resolvePersonByName(authorName);
			if (personDbId == null) {
				log.warn(`Spotlight article ${articleId}: author "${authorName}" not matched to a person.`);
				continue;
			}
			await db.insert(schema.spotlightArticlesToPersons).values({
				spotlightArticleId: articleId,
				personId: personDbId,
				role: "author",
			});
		}
	}

	for (const [articleId, authorNames] of impactCaseStudyIdToAuthorNames) {
		for (const authorName of authorNames) {
			const personDbId = resolvePersonByName(authorName);
			if (personDbId == null) {
				log.warn(`Impact case study ${articleId}: author "${authorName}" not matched to a person.`);
				continue;
			}
			await db.insert(schema.impactCaseStudiesToPersons).values({
				impactCaseStudyId: articleId,
				personId: personDbId,
				role: "author",
			});
		}
	}

	log.info("Writing assets cache manifest...");

	await writeAssetsCacheData(assetsCache);

	//

	log.success("Successfully completed data migration.");
}

main()
	.catch((error: unknown) => {
		log.error("Failed to complete data migration.", error);
		process.exitCode = 1;
	})
	.finally(() => {
		return db.$client.end().catch((error: unknown) => {
			log.error("Failed to close database connection.\n", error);
			process.exitCode = 1;
		});
	});
