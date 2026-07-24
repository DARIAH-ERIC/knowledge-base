import { createUrl, createUrlSearchParams, log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { and, eq, gt, sql } from "@dariah-eric/database/sql";
import slugify from "@sindresorhus/slugify";
import type { JSONContent } from "@tiptap/core";

import { env } from "../config/env.config";

/**
 * Restores the button affordance of WordPress "call to action" buttons (`wp-block-button__link`) by
 * upgrading the migrated inline link _in place_ to a `buttonLink` node — keeping it at the same
 * document position it holds in WordPress. Dry run by default; `--apply` writes the changes.
 *
 * The migration (`@dariah-eric/migrate`) parses content with TipTap's `StarterKit`, whose `Link`
 * extension turned each `wp-block-button__link` anchor into an ordinary inline link at the right
 * place — so the CTA text, href, and position all survived; only the button _styling_ (the
 * `buttonLink` node, added later in #699) was lost. This finds those inline links (matched by the
 * href of a `wp-block-button` in the live source) and replaces them with a `buttonLink` node.
 *
 * Idempotent and self-healing: it also removes any stray trailing block that is _only_ a
 * `buttonLink` whose href already appears as an inline link elsewhere in the same item — the
 * duplicates an earlier (buggy) version of this script appended. Re-running once everything is a
 * `buttonLink` is a no-op.
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

/** Finds `<a class="… wp-block-button__link …" href="…">Label</a>` anchors, as href → label. */
function extractCtaButtonLabels(html: string): Map<string, string> {
	const labels = new Map<string, string>();
	const re = /<a\b([^>]*\bclass="[^"]*\bwp-block-button__link\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi;

	let match: RegExpExecArray | null;
	while ((match = re.exec(html)) !== null) {
		const href = /\bhref="([^"]*)"/.exec(match[1]!)?.[1];
		const label = toPlainLabel(match[2]!);
		if (href != null && href !== "") {
			labels.set(href, label);
		}
	}

	return labels;
}

/** Minimal shape of a stored TipTap document node — what this script reads and rewrites. */
interface RtNode {
	type?: string;
	text?: string;
	marks?: Array<{ type?: string; attrs?: { href?: unknown } | null }> | null;
	attrs?: Record<string, unknown> | null;
	content?: Array<RtNode> | null;
}

/** The href of a `link` mark on a text node, if any. */
function linkHref(node: RtNode): string | null {
	if (typeof node.text !== "string") {
		return null;
	}
	for (const mark of node.marks ?? []) {
		if (mark.type === "link" && typeof mark.attrs?.href === "string") {
			return mark.attrs.href;
		}
	}
	return null;
}

/** Collects every `link` mark href used anywhere in a document. */
function collectLinkHrefs(node: RtNode, into: Set<string>): void {
	const href = linkHref(node);
	if (href != null) {
		into.add(href);
	}
	for (const child of node.content ?? []) {
		collectLinkHrefs(child, into);
	}
}

/**
 * If the document is (ignoring empty paragraphs) nothing but a single `buttonLink` node, returns
 * its href — the shape of the stray trailing block an earlier version of this script appended.
 */
function loneButtonLinkHref(doc: RtNode): string | null {
	const state = { href: null as string | null, buttonLinks: 0, hasText: false };

	const visit = (node: RtNode): void => {
		if (node.type === "buttonLink") {
			state.buttonLinks += 1;
			if (typeof node.attrs?.href === "string") {
				state.href = node.attrs.href;
			}
		} else if (typeof node.text === "string" && node.text.trim() !== "") {
			state.hasText = true;
		}
		for (const child of node.content ?? []) {
			visit(child);
		}
	};
	visit(doc);

	return !state.hasText && state.buttonLinks === 1 ? state.href : null;
}

/**
 * Rewrites a node's children, replacing each run of consecutive text nodes that carry a `link` mark
 * whose href is a CTA target with a single `buttonLink` node (label taken from the linked text,
 * falling back to the WordPress button label). Recurses into non-matching children.
 */
function upgradeChildren(
	children: Array<RtNode>,
	labelByHref: Map<string, string>,
	upgraded: Set<string>,
): Array<RtNode> {
	const out: Array<RtNode> = [];
	let i = 0;

	while (i < children.length) {
		const href = linkHref(children[i]!);
		if (href != null && labelByHref.has(href)) {
			let text = "";
			let j = i;
			while (j < children.length && linkHref(children[j]!) === href) {
				text += children[j]!.text ?? "";
				j += 1;
			}
			const label = text.trim() !== "" ? text.trim() : (labelByHref.get(href) ?? href);
			out.push({ type: "buttonLink", attrs: { href, label, variant: "primary" } });
			upgraded.add(href);
			i = j;
		} else {
			const child = children[i]!;
			out.push(
				child.content != null
					? { ...child, content: upgradeChildren(child.content, labelByHref, upgraded) }
					: child,
			);
			i += 1;
		}
	}

	return out;
}

interface EntityBlock {
	blockId: string;
	fieldId: string;
	position: number;
	blockType: string;
	content: RtNode | null;
}

/** Published `news` entities' `content` field blocks, ordered by position, keyed by entity slug. */
async function findNewsEntityBlocks(): Promise<Map<string, Array<EntityBlock>>> {
	const rows = await db
		.select({
			slug: schema.entities.slug,
			blockId: schema.contentBlocks.id,
			fieldId: schema.contentBlocks.fieldId,
			position: schema.contentBlocks.position,
			blockType: schema.contentBlockTypes.type,
			content: schema.richTextContentBlocks.content,
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

	const bySlug = new Map<string, Array<EntityBlock>>();

	for (const row of rows) {
		if (!bySlug.has(row.slug)) {
			bySlug.set(row.slug, []);
		}
		bySlug.get(row.slug)!.push({
			blockId: row.blockId,
			fieldId: row.fieldId,
			position: row.position,
			blockType: row.blockType,
			content: (row.content as RtNode | null) ?? null,
		});
	}

	return bySlug;
}

interface Upgrade {
	blockId: string;
	content: RtNode;
	hrefs: Array<string>;
}

interface Plan {
	entitySlug: string;
	fieldId: string;
	upgrades: Array<Upgrade>;
	/** Positions of stray lone-`buttonLink` blocks to delete (duplicates of an existing link). */
	deletions: Array<{ blockId: string; position: number; href: string }>;
}

function planForItem(
	entitySlug: string,
	blocks: Array<EntityBlock>,
	labelByHref: Map<string, string>,
): Plan | null {
	const fieldId = blocks[0]?.fieldId;
	if (fieldId == null) {
		return null;
	}

	// Hrefs present as an inline link somewhere in the item (the "real", correctly-placed CTA).
	const linkHrefs = new Set<string>();
	for (const block of blocks) {
		if (block.blockType === "rich_text" && block.content != null) {
			collectLinkHrefs(block.content, linkHrefs);
		}
	}

	const upgrades: Array<Upgrade> = [];
	const deletions: Array<{ blockId: string; position: number; href: string }> = [];

	for (const block of blocks) {
		if (block.blockType !== "rich_text" || block.content == null) {
			continue;
		}

		// A stray lone-`buttonLink` block is a duplicate only when the same CTA also exists as an
		// inline link elsewhere — never delete the sole representation of a CTA.
		const lone = loneButtonLinkHref(block.content);
		if (lone != null && labelByHref.has(lone) && linkHrefs.has(lone)) {
			deletions.push({ blockId: block.blockId, position: block.position, href: lone });
			continue;
		}

		const upgradedHrefs = new Set<string>();
		const content = {
			...block.content,
			content: upgradeChildren(block.content.content ?? [], labelByHref, upgradedHrefs),
		};
		if (upgradedHrefs.size > 0) {
			upgrades.push({ blockId: block.blockId, content, hrefs: [...upgradedHrefs] });
		}
	}

	if (upgrades.length === 0 && deletions.length === 0) {
		return null;
	}

	return { entitySlug, fieldId, upgrades, deletions };
}

function buildPlans(
	posts: Array<WordPressPost>,
	blocksBySlug: Map<string, Array<EntityBlock>>,
): Array<Plan> {
	const plans: Array<Plan> = [];

	for (const post of posts) {
		const labelByHref = extractCtaButtonLabels(post.content.rendered);
		if (labelByHref.size === 0) {
			continue;
		}

		const slug = normalizeWordPressSlug(post.slug);
		const blocks = blocksBySlug.get(slug);
		if (blocks == null) {
			continue;
		}

		const plan = planForItem(slug, blocks, labelByHref);
		if (plan != null) {
			plans.push(plan);
		}
	}

	return plans;
}

async function applyPlans(plans: Array<Plan>): Promise<{ upgraded: number; removed: number }> {
	let upgraded = 0;
	let removed = 0;

	for (const plan of plans) {
		await db.transaction(async (tx) => {
			for (const upgrade of plan.upgrades) {
				await tx
					.update(schema.richTextContentBlocks)
					.set({ content: upgrade.content as unknown as JSONContent })
					.where(eq(schema.richTextContentBlocks.id, upgrade.blockId));
				upgraded += upgrade.hrefs.length;
			}

			// Delete duplicates high-position-first so each position gap is closed independently.
			for (const deletion of plan.deletions.toSorted((a, b) => b.position - a.position)) {
				await tx.delete(schema.contentBlocks).where(eq(schema.contentBlocks.id, deletion.blockId));
				await tx
					.update(schema.contentBlocks)
					.set({ position: sql`${schema.contentBlocks.position} - 1` })
					.where(
						and(
							eq(schema.contentBlocks.fieldId, plan.fieldId),
							gt(schema.contentBlocks.position, deletion.position),
						),
					);
				removed += 1;
			}
		});
	}

	return { upgraded, removed };
}

async function main(): Promise<void> {
	const apply = process.argv.includes("--apply");

	log.info("Fetching WordPress posts…");
	const posts = await fetchAllPosts(wordPressApiBaseUrl);

	log.info("Loading migrated news content blocks…");
	const blocksBySlug = await findNewsEntityBlocks();

	const plans = buildPlans(posts, blocksBySlug);

	const totalUpgrades = plans.reduce((sum, plan) => sum + plan.upgrades.length, 0);
	const totalDeletions = plans.reduce((sum, plan) => sum + plan.deletions.length, 0);
	log.info(
		`${String(totalUpgrades)} inline CTA links to upgrade and ${String(totalDeletions)} duplicate blocks to remove across ${String(plans.length)} items.`,
	);
	for (const plan of plans) {
		for (const upgrade of plan.upgrades) {
			log.info(`  ${plan.entitySlug}: upgrade → buttonLink (${upgrade.hrefs.join(", ")})`);
		}
		for (const deletion of plan.deletions) {
			log.info(`  ${plan.entitySlug}: remove duplicate buttonLink block (${deletion.href})`);
		}
	}

	if (!apply) {
		log.info(`Pass \`--apply\` to upgrade the links and remove the duplicates.`);
		return;
	}

	const { upgraded, removed } = await applyPlans(plans);
	log.success(`Upgraded ${String(upgraded)} CTA links and removed ${String(removed)} duplicates.`);
}

main()
	.catch((error: unknown) => {
		log.error(error);
		process.exitCode = 1;
	})
	// oxlint-disable-next-line typescript/no-misused-promises, typescript/strict-void-return
	.finally(() => db.$client.end());
