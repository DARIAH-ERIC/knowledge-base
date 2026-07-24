import { assert, createUrl, createUrlSearchParams, log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { and, eq } from "@dariah-eric/database/sql";
import slugify from "@sindresorhus/slugify";
import type { JSONContent } from "@tiptap/core";

import { env } from "../config/env.config";

/**
 * Restores the "call to action" buttons that WordPress rendered as a Gutenberg button block (`<a
 * class="wp-block-button__link" href="…">Label</a>`) by appending them to the matching migrated
 * news item as a `rich_text` block containing a `buttonLink` inline node. Dry run by default;
 * `--apply` writes the changes.
 *
 * The migration (`@dariah-eric/migrate`) parsed content with the stock TipTap `StarterKit`, which
 * has no `buttonLink` node — that node was added later (#699) — so a `wp-block-button` was
 * flattened to plain text or a bare link and its CTA affordance lost. This re-fetches the live
 * WordPress source and reconstructs the node from the button's `href` + text.
 *
 * Conservative and idempotent: a button is only appended when the item does not already contain a
 * `buttonLink` with that exact `href` (so re-runs, and items an editor has already fixed, are left
 * alone). Buttons are appended as trailing blocks — WordPress CTA buttons sit at the end of the
 * article, which is also where they belong in the migrated content.
 *
 * @example
 * 	pnpm run data:backfill:cta-button-links
 * 	pnpm run data:backfill:cta-button-links -- --apply
 */

const wordPressApiBaseUrl = "https://www.dariah.eu";

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

/** Decodes the handful of HTML entities that appear in button labels, then strips any tags. */
function toPlainLabel(html: string): string {
	return html
		.replaceAll(/<[^>]+>/g, "")
		.replaceAll("&amp;", "&")
		.replaceAll("&nbsp;", " ")
		.replaceAll("&#8217;", "’")
		.replaceAll("&#8211;", "–")
		.replaceAll("&quot;", '"')
		.replaceAll(/\s+/g, " ")
		.trim();
}

interface CtaButton {
	href: string;
	label: string;
}

/** Finds `<a class="… wp-block-button__link …" href="…">Label</a>` anchors in document order. */
function extractCtaButtons(html: string): Array<CtaButton> {
	const results: Array<CtaButton> = [];
	const re = /<a\b([^>]*\bclass="[^"]*\bwp-block-button__link\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi;

	let match: RegExpExecArray | null;
	while ((match = re.exec(html)) !== null) {
		const href = /\bhref="([^"]*)"/.exec(match[1]!)?.[1];
		const label = toPlainLabel(match[2]!);
		if (href != null && href !== "" && label !== "") {
			results.push({ href, label });
		}
	}

	return results;
}

/** Collects every `href` used by a `buttonLink` node anywhere in a stored rich_text document. */
function collectButtonLinkHrefs(content: unknown, into: Set<string>): void {
	if (content == null || typeof content !== "object") {
		return;
	}
	const node = content as { type?: unknown; attrs?: { href?: unknown }; content?: unknown };
	if (node.type === "buttonLink" && typeof node.attrs?.href === "string") {
		into.add(node.attrs.href);
	}
	if (Array.isArray(node.content)) {
		for (const child of node.content) {
			collectButtonLinkHrefs(child, into);
		}
	}
}

interface NewsContentField {
	fieldId: string;
	maxPosition: number;
	existingButtonHrefs: Set<string>;
}

/** Published `news` items' `content` field, keyed by slug: its id, last position, and CTA hrefs. */
async function findNewsContentFields(): Promise<Map<string, NewsContentField>> {
	const rows = await db
		.select({
			slug: schema.entities.slug,
			fieldId: schema.contentBlocks.fieldId,
			position: schema.contentBlocks.position,
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
		.leftJoin(
			schema.richTextContentBlocks,
			eq(schema.richTextContentBlocks.id, schema.contentBlocks.id),
		)
		.where(
			and(
				eq(schema.entityTypes.type, "news"),
				eq(schema.entityStatus.type, "published"),
				eq(schema.entityTypesFieldsNames.fieldName, "content"),
			),
		)
		.orderBy(schema.entities.slug, schema.contentBlocks.position);

	const bySlug = new Map<string, NewsContentField>();

	for (const row of rows) {
		let field = bySlug.get(row.slug);
		if (field == null) {
			field = { fieldId: row.fieldId, maxPosition: -1, existingButtonHrefs: new Set() };
			bySlug.set(row.slug, field);
		}
		field.maxPosition = Math.max(field.maxPosition, row.position);
		collectButtonLinkHrefs(row.richTextContent, field.existingButtonHrefs);
	}

	return bySlug;
}

interface Candidate {
	entitySlug: string;
	fieldId: string;
	position: number;
	button: CtaButton;
}

function findCandidates(
	posts: Array<WordPressPost>,
	fieldsBySlug: Map<string, NewsContentField>,
): Array<Candidate> {
	const candidates: Array<Candidate> = [];

	for (const post of posts) {
		const buttons = extractCtaButtons(post.content.rendered);
		if (buttons.length === 0) {
			continue;
		}

		const slug = normalizeWordPressSlug(post.slug);
		const field = fieldsBySlug.get(slug);
		if (field == null) {
			continue;
		}

		// Track appends per field locally so several new buttons get consecutive trailing positions.
		let nextPosition = field.maxPosition + 1;

		for (const button of buttons) {
			if (field.existingButtonHrefs.has(button.href)) {
				continue;
			}
			field.existingButtonHrefs.add(button.href);
			candidates.push({ entitySlug: slug, fieldId: field.fieldId, position: nextPosition, button });
			nextPosition += 1;
		}
	}

	return candidates;
}

/** Wraps a CTA in the stored rich_text document shape: a paragraph holding one `buttonLink` node. */
function toButtonLinkDocument(button: CtaButton): JSONContent {
	return {
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [
					{
						type: "buttonLink",
						attrs: { href: button.href, label: button.label, variant: "primary" },
					},
				],
			},
		],
	};
}

async function applyCandidates(candidates: Array<Candidate>): Promise<number> {
	const [richTextType] = await db
		.select({ id: schema.contentBlockTypes.id })
		.from(schema.contentBlockTypes)
		.where(eq(schema.contentBlockTypes.type, "rich_text"))
		.limit(1);
	assert(richTextType, "Missing `rich_text` content block type.");

	let applied = 0;

	for (const candidate of candidates) {
		await db.transaction(async (tx) => {
			const [block] = await tx
				.insert(schema.contentBlocks)
				.values({
					fieldId: candidate.fieldId,
					typeId: richTextType.id,
					position: candidate.position,
				})
				.returning({ id: schema.contentBlocks.id });
			assert(block);

			await tx.insert(schema.richTextContentBlocks).values({
				id: block.id,
				content: toButtonLinkDocument(candidate.button),
			});

			applied += 1;
		});
	}

	return applied;
}

async function main(): Promise<void> {
	const apply = process.argv.includes("--apply");

	log.info("Fetching WordPress posts…");
	const posts = await fetchAllPosts(wordPressApiBaseUrl);

	log.info("Loading migrated news content fields…");
	const fieldsBySlug = await findNewsContentFields();

	const candidates = findCandidates(posts, fieldsBySlug);

	log.info(`${String(candidates.length)} CTA buttons to append across the migrated news items.`);
	for (const candidate of candidates) {
		log.info(`  ${candidate.entitySlug}: “${candidate.button.label}” → ${candidate.button.href}`);
	}

	if (!apply) {
		log.info(`Pass \`--apply\` to append them as \`buttonLink\` rich_text blocks.`);
		return;
	}

	const applied = await applyCandidates(candidates);
	log.success(`Appended ${String(applied)} CTA button links.`);
}

main()
	.catch((error: unknown) => {
		log.error(error);
		process.exitCode = 1;
	})
	// oxlint-disable-next-line typescript/no-misused-promises, typescript/strict-void-return
	.finally(() => db.$client.end());
