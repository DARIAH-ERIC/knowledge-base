import type { JSONContent } from "@tiptap/core";

/**
 * WordPress-originated TipTap documents inherit a number of authoring oddities from the old CMS:
 * headings that were really bolded paragraphs, `<br>` used for layout, `&nbsp;` sprinkled as
 * spacing, and empty spacer paragraphs. This module normalises those into clean, semantic TipTap
 * JSON.
 *
 * The transform is pure and idempotent: running it twice yields the same document, and a document
 * with no oddities is returned structurally unchanged (so callers can diff to skip no-op writes).
 */

const NON_BREAKING_SPACE = /\u00A0/g;

function marksKey(node: JSONContent): string {
	return JSON.stringify(node.marks ?? []);
}

function isHardBreak(node: JSONContent | undefined): boolean {
	return node?.type === "hardBreak";
}

function isWhitespaceText(node: JSONContent | undefined): boolean {
	return node?.type === "text" && (node.text ?? "").trim() === "";
}

/** Removes a mark type from a text node, dropping the `marks` key entirely when none remain. */
function stripMark(node: JSONContent, mark: string): JSONContent {
	if (node.type !== "text" || node.marks == null) {
		return node;
	}
	const marks = node.marks.filter((m) => m.type !== mark);
	if (marks.length === node.marks.length) {
		return node;
	}
	const { marks: _dropped, ...rest } = node;
	return marks.length > 0 ? { ...rest, marks } : rest;
}

/** Merges consecutive text nodes that carry identical marks into a single node. */
function mergeAdjacentText(children: Array<JSONContent>): Array<JSONContent> {
	const out: Array<JSONContent> = [];
	for (const child of children) {
		const prev = out.at(-1);
		if (child.type === "text" && prev?.type === "text" && marksKey(prev) === marksKey(child)) {
			out[out.length - 1] = { ...prev, text: (prev.text ?? "") + (child.text ?? "") };
		} else {
			out.push(child);
		}
	}
	return out;
}

/**
 * Normalises the inline children of a heading or paragraph:
 *
 * - Headings: strip `bold` (a presentational concern of the frontend) and turn `<br>` into a space;
 * - Paragraphs: collapse consecutive `<br>` to one and drop `<br>` at the edges, but keep a single
 *   intentional mid-text line break;
 * - Both: collapse whitespace-only text nodes, drop whitespace/`<br>` at the edges, and trim the
 *   outer edges of the first/last text node.
 */
function normalizeInlineChildren(
	children: Array<JSONContent>,
	container: "heading" | "paragraph",
): Array<JSONContent> {
	let nodes = children;

	if (container === "heading") {
		nodes = nodes.map((node) => stripMark(node, "bold"));
		// A `<br>` in a heading was layout, not a line break: turn it into a plain space that the
		// surrounding whitespace handling then collapses/trims away.
		nodes = nodes.map((node) => (isHardBreak(node) ? { type: "text", text: " " } : node));
	} else {
		// Collapse runs of consecutive hard breaks to a single break.
		nodes = nodes.filter((node, index) => !(isHardBreak(node) && isHardBreak(nodes[index - 1])));
	}

	// Collapse every whitespace-only text node to a single plain space, then merge neighbours so that
	// injected spaces fold into adjacent same-mark text.
	nodes = nodes.map((node) => (isWhitespaceText(node) ? { type: "text", text: " " } : node));
	nodes = mergeAdjacentText(nodes);

	// Trim the edges: drop leading/trailing hard breaks and whitespace-only text until stable.
	while (nodes[0] != null && (isHardBreak(nodes[0]) || isWhitespaceText(nodes[0]))) {
		nodes = nodes.slice(1);
	}
	while (nodes.at(-1) != null && (isHardBreak(nodes.at(-1)) || isWhitespaceText(nodes.at(-1)))) {
		nodes = nodes.slice(0, -1);
	}

	// Trim the outer whitespace of the remaining first/last text node.
	if (nodes[0]?.type === "text") {
		nodes = [{ ...nodes[0], text: (nodes[0].text ?? "").replace(/^\s+/, "") }, ...nodes.slice(1)];
	}
	const last = nodes.at(-1);
	if (last?.type === "text") {
		nodes = [...nodes.slice(0, -1), { ...last, text: (last.text ?? "").replace(/\s+$/, "") }];
	}

	return mergeAdjacentText(nodes);
}

const DROP_WHEN_EMPTY = new Set(["listItem", "bulletList", "orderedList", "blockquote"]);

/**
 * Recursively cleans a node. Returns `null` when the node should be dropped: an emptied paragraph
 * or heading, or a list/list-item/blockquote that cleaning has left with no content.
 */
function cleanNode(node: JSONContent): JSONContent | null {
	if (node.type === "text") {
		return { ...node, text: (node.text ?? "").replace(NON_BREAKING_SPACE, " ") };
	}

	// Paragraphs and headings are handled here even without a `content` key, so that WordPress's empty
	// spacer paragraphs (`{ "type": "paragraph" }`) are dropped rather than passed through.
	if (node.type === "heading" || node.type === "paragraph") {
		const children = (node.content ?? [])
			.map((child) => cleanNode(child))
			.filter((child): child is JSONContent => child != null);
		const normalized = normalizeInlineChildren(children, node.type);
		if (normalized.length === 0) {
			return null;
		}
		return { ...node, content: normalized };
	}

	if (node.content == null) {
		// Atoms and leaf nodes (image, horizontalRule, hardBreak) pass through untouched.
		return node;
	}

	const children = node.content
		.map((child) => cleanNode(child))
		.filter((child): child is JSONContent => child != null);

	// Drop containers that cleaning has left empty — an empty bullet, list, or quote is WordPress
	// noise. `doc` is never dropped; it stays as an empty document for the caller to handle.
	if (children.length === 0 && node.type != null && DROP_WHEN_EMPTY.has(node.type)) {
		return null;
	}

	return { ...node, content: children };
}

/**
 * Cleans a WordPress-originated TipTap document. Pure and idempotent; a document without oddities
 * is returned structurally identical so callers can `JSON.stringify`-diff to avoid no-op writes.
 */
export function cleanTiptapDoc(doc: JSONContent): JSONContent {
	return cleanNode(doc) ?? { type: "doc", content: [] };
}

export interface OverExtendedLink {
	text: string;
	href: string | undefined;
}

/**
 * A WordPress oddity we cannot safely auto-fix: a link mark whose visible text has swallowed the
 * trailing punctuation and following prose (e.g. `"https://x.org/). The next sentence…"`). Detected
 * heuristically for a manual-fix report only — never mutated.
 */
function isOverExtendedLinkText(text: string): boolean {
	return (
		/https?:\/\/\S+\s+\S/.test(text) ||
		/\.\s+[A-Z]/.test(text) ||
		/\)\s+\S/.test(text) ||
		text.length > 100
	);
}

export function findOverExtendedLinks(doc: JSONContent): Array<OverExtendedLink> {
	const issues: Array<OverExtendedLink> = [];

	function walk(node: JSONContent): void {
		if (node.type === "text") {
			const link = node.marks?.find((mark) => mark.type === "link");
			if (link != null && isOverExtendedLinkText(node.text ?? "")) {
				issues.push({ text: node.text ?? "", href: link.attrs?.href as string | undefined });
			}
		}
		for (const child of node.content ?? []) {
			walk(child);
		}
	}

	walk(doc);
	return issues;
}

/** A paragraph that still contains a `<br>` after cleaning, with the break shown as `⏎` in context. */
export interface MidTextHardBreak {
	text: string;
}

/**
 * Reports paragraphs that retain a mid-text hard break after cleaning. These are kept on the
 * assumption they are intentional line breaks, but they are frequently WordPress layout artifacts,
 * so they are surfaced for a human to review. Run this on the _cleaned_ document.
 */
export function findMidTextHardBreaks(doc: JSONContent): Array<MidTextHardBreak> {
	const breaks: Array<MidTextHardBreak> = [];

	function walk(node: JSONContent): void {
		if (
			node.type === "paragraph" &&
			(node.content ?? []).some((child) => child.type === "hardBreak")
		) {
			const text = (node.content ?? [])
				.map((child) => {
					if (child.type === "hardBreak") {
						return " ⏎ ";
					}
					return child.type === "text" ? (child.text ?? "") : "";
				})
				.join("")
				.trim();
			breaks.push({ text });
		}
		for (const child of node.content ?? []) {
			walk(child);
		}
	}

	walk(doc);
	return breaks;
}
