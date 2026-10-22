import type { JSONContent } from "@tiptap/core";

/**
 * Normalises a TipTap (rich-text) document into clean, semantic JSON. Removes authoring oddities
 * that accumulate from pasting or an old CMS import: headings that were really bolded paragraphs,
 * `<br>` used for layout, `&nbsp;` sprinkled as spacing, empty spacer paragraphs, underlined text
 * (underline marks a link, so it is never the author's to apply), and presentational HTML
 * attributes (`class`, `rel`, `target`) copied from source markup. Captions and footnote notes lose
 * bold altogether (see {@link normalizeInlineRichTextDocument}).
 *
 * The transform is pure and idempotent: running it twice yields the same document, and a document
 * with no oddities is returned structurally unchanged (so callers can diff to skip no-op writes).
 * Shared by the `@dariah-eric/maintenance` cli and the admin dashboard, and — through
 * {@link normalizeRichTextSlice} — by the editor's paste handling, which applies the same rules as
 * content arrives.
 */

const NON_BREAKING_SPACE = /\u00A0/g;

/**
 * How far a node is cut open on each side. `0` is a whole node; `n` is a node whose start (or end)
 * was cut, along with its first (or last) `n - 1` descendants. Only a pasted slice has open nodes —
 * a stored document is whole throughout.
 *
 * An open node continues the text it is pasted into, so it is never dropped and its open side is
 * never trimmed: an empty open paragraph is where the paste meets the cursor, and a space at its
 * open edge separates the pasted text from the author's own.
 */
interface OpenDepth {
	start: number;
	end: number;
}

const CLOSED: OpenDepth = { start: 0, end: 0 };

function isOpen(open: OpenDepth): boolean {
	return open.start > 0 || open.end > 0;
}

/** The open depth of the child at `index` of `count` siblings, inside a node open by `open`. */
function childOpenDepth(open: OpenDepth, index: number, count: number): OpenDepth {
	return {
		start: index === 0 ? Math.max(open.start - 1, 0) : 0,
		end: index === count - 1 ? Math.max(open.end - 1, 0) : 0,
	};
}

function stripImportedHtmlAttributes(attrs: JSONContent["attrs"]): JSONContent["attrs"] {
	if (
		attrs == null ||
		(!Object.hasOwn(attrs, "class") &&
			!Object.hasOwn(attrs, "rel") &&
			!Object.hasOwn(attrs, "target"))
	) {
		return attrs;
	}

	const { class: _class, rel: _rel, target: _target, ...rest } = attrs;
	return Object.keys(rest).length > 0 ? rest : undefined;
}

/** Removes presentational and browser-behaviour attributes imported from source HTML. */
function stripImportedHtmlAttributesFromNode(node: JSONContent): JSONContent {
	const attrs = stripImportedHtmlAttributes(node.attrs);
	let marks = node.marks;

	if (marks != null) {
		const cleanedMarks = marks.map((mark) => {
			const markAttrs = stripImportedHtmlAttributes(mark.attrs);
			if (markAttrs === mark.attrs) {
				return mark;
			}

			const cleanedMark = { ...mark };
			if (markAttrs == null) {
				delete cleanedMark.attrs;
			} else {
				cleanedMark.attrs = markAttrs;
			}
			return cleanedMark;
		});
		if (cleanedMarks.some((mark, index) => mark !== marks?.[index])) {
			marks = cleanedMarks;
		}
	}

	if (attrs === node.attrs && marks === node.marks) {
		return node;
	}

	const cleanedNode = { ...node };
	if (attrs == null) {
		delete cleanedNode.attrs;
	} else {
		cleanedNode.attrs = attrs;
	}
	if (marks == null) {
		delete cleanedNode.marks;
	} else {
		cleanedNode.marks = marks;
	}
	return cleanedNode;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * Whether a value is a richtext document. Captions and footnote notes are stored as documents of
 * their own inside a node's attributes — `{ type: "doc", … }` is what marks one out.
 */
function isRichTextDocument(value: unknown): value is JSONContent {
	return isRecord(value) && value.type === "doc";
}

/**
 * Normalises the documents nested in a node's attributes: an image, gallery, media or table
 * caption, and the note a footnote marker carries.
 *
 * These sit outside the content walk — the walk follows `content`, and a caption is not part of the
 * document it captions — so without this they kept every oddity the surrounding prose had cleaned
 * away: an imported `target`/`rel` on a link, a non-breaking space, a spacer paragraph.
 *
 * Recognised by shape rather than by a list of attribute names, so a caption arriving on a new kind
 * of block is covered by the day it exists, and so the captions a gallery keeps in an array of item
 * objects need no case of their own.
 *
 * Values are rebuilt only where something below them changed, keeping the structural identity the
 * caller's no-op diff depends on.
 */
function normalizeAttributeValue(value: unknown): unknown {
	if (isRichTextDocument(value)) {
		/* Every document kept in an attribute is a caption or a footnote note, written in the inline
		   editor — normalised by the prose rules, with that editor's narrower set of marks. */
		return normalizeInlineRichTextDocument(value);
	}

	if (Array.isArray(value)) {
		const items = value.map((item) => normalizeAttributeValue(item));
		return items.some((item, index) => item !== value[index]) ? items : value;
	}

	if (isRecord(value)) {
		const entries = Object.entries(value).map(
			([key, item]) => [key, normalizeAttributeValue(item)] as const,
		);

		return entries.some(([key, item]) => item !== value[key]) ? Object.fromEntries(entries) : value;
	}

	return value;
}

function normalizeNestedDocuments(node: JSONContent): JSONContent {
	if (node.attrs == null) {
		return node;
	}

	const attrs = normalizeAttributeValue(node.attrs) as JSONContent["attrs"];

	return attrs === node.attrs ? node : { ...node, attrs };
}

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

/** Removes a mark type from every text node in a subtree. */
function stripMarkDeep(node: JSONContent, mark: string): JSONContent {
	const stripped = stripMark(node, mark);
	if (stripped.content == null) {
		return stripped;
	}
	return { ...stripped, content: stripped.content.map((child) => stripMarkDeep(child, mark)) };
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
 *   outer edges of the first/last text node — except on a side cut open by a paste.
 */
function normalizeInlineChildren(
	children: Array<JSONContent>,
	container: "heading" | "paragraph",
	open: OpenDepth,
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

	// Trim the edges: drop leading/trailing hard breaks and whitespace-only text until stable, then
	// the outer whitespace of the remaining first/last text node.
	if (open.start === 0) {
		while (nodes[0] != null && (isHardBreak(nodes[0]) || isWhitespaceText(nodes[0]))) {
			nodes = nodes.slice(1);
		}
		if (nodes[0]?.type === "text") {
			nodes = [{ ...nodes[0], text: (nodes[0].text ?? "").replace(/^\s+/, "") }, ...nodes.slice(1)];
		}
	}
	if (open.end === 0) {
		while (nodes.at(-1) != null && (isHardBreak(nodes.at(-1)) || isWhitespaceText(nodes.at(-1)))) {
			nodes = nodes.slice(0, -1);
		}
		const last = nodes.at(-1);
		if (last?.type === "text") {
			nodes = [...nodes.slice(0, -1), { ...last, text: (last.text ?? "").replace(/\s+$/, "") }];
		}
	}

	return mergeAdjacentText(nodes);
}

const DROP_WHEN_EMPTY = new Set(["listItem", "bulletList", "orderedList", "blockquote"]);

/**
 * Table cells are `block+` in the schema and cannot be dropped when cleaning empties them: a cell
 * removed from one row leaves it short of its siblings and corrupts the table. An empty cell is
 * legitimate content — a gap in a data table — so it keeps a placeholder paragraph instead, which
 * is exactly what an empty cell holds in the editor.
 */
const KEEP_PLACEHOLDER_WHEN_EMPTY = new Set(["tableCell", "tableHeader"]);

/**
 * Recursively cleans a node. Returns `null` when the node should be dropped: an emptied paragraph
 * or heading, or a list/list-item/blockquote that cleaning has left with no content — unless the
 * node is cut open (see {@link OpenDepth}).
 */
function cleanNode(node: JSONContent, open: OpenDepth = CLOSED): JSONContent | null {
	const cleanedNode = normalizeNestedDocuments(stripImportedHtmlAttributesFromNode(node));

	if (cleanedNode.type === "text") {
		return { ...cleanedNode, text: (cleanedNode.text ?? "").replace(NON_BREAKING_SPACE, " ") };
	}

	// Paragraphs and headings are handled here even without a `content` key, so that empty spacer
	// paragraphs (`{ "type": "paragraph" }`) are dropped rather than passed through.
	if (cleanedNode.type === "heading" || cleanedNode.type === "paragraph") {
		const children = (cleanedNode.content ?? [])
			.map((child) => cleanNode(child))
			.filter((child): child is JSONContent => child != null);
		const normalized = normalizeInlineChildren(children, cleanedNode.type, open);
		if (normalized.length === 0) {
			if (isOpen(open)) {
				const { content: _content, ...rest } = cleanedNode;
				return rest;
			}
			return null;
		}
		return { ...cleanedNode, content: normalized };
	}

	if (cleanedNode.content == null) {
		// Atoms and leaf nodes (image, horizontalRule, hardBreak) pass through untouched.
		return cleanedNode;
	}

	const children = cleanNodes(cleanedNode.content, open);

	// Drop containers that cleaning has left empty — an empty bullet, list, or quote is noise.
	// `doc` is never dropped; it stays as an empty document for the caller to handle.
	if (children.length === 0 && cleanedNode.type != null) {
		if (DROP_WHEN_EMPTY.has(cleanedNode.type) && !isOpen(open)) {
			return null;
		}
		if (KEEP_PLACEHOLDER_WHEN_EMPTY.has(cleanedNode.type)) {
			return { ...cleanedNode, content: [{ type: "paragraph" }] };
		}
	}

	return { ...cleanedNode, content: children };
}

/** Cleans a run of siblings inside a parent open by `open`, dropping the ones cleaned away. */
function cleanNodes(nodes: Array<JSONContent>, open: OpenDepth): Array<JSONContent> {
	return nodes
		.map((node, index) => cleanNode(node, childOpenDepth(open, index, nodes.length)))
		.filter((node): node is JSONContent => node != null);
}

/**
 * Normalises a TipTap document. Pure and idempotent; a document without oddities is returned
 * structurally identical so callers can `JSON.stringify`-diff to avoid no-op writes.
 */
export function normalizeRichTextDocument(doc: JSONContent): JSONContent {
	return cleanNode(stripMarkDeep(doc, "underline")) ?? { type: "doc", content: [] };
}

/**
 * Normalises an inline document: a caption, or the note a footnote marker carries. The rules are a
 * document's, and bold goes too — the inline editor has no bold mark, since emphasis in a caption
 * or a note is the website's styling, not the author's. A bold mark left in a stored caption would
 * not merely linger: the editor cannot parse a mark its schema lacks, and opens the caption empty.
 *
 * Bold is stripped before the walk, so the text it split is merged by it, and a second pass changes
 * nothing.
 */
export function normalizeInlineRichTextDocument(doc: JSONContent): JSONContent {
	return normalizeRichTextDocument(stripMarkDeep(doc, "bold"));
}

/**
 * Normalises the top-level nodes of a pasted slice, cut open `openStart` levels deep at its start
 * and `openEnd` at its end (ProseMirror's `Slice`). The rules are the document's, except along the
 * open edges, which stay where the paste meets the surrounding text (see {@link OpenDepth}).
 *
 * The slice's open depths stay valid for the result: no node on an open edge is dropped.
 */
export function normalizeRichTextSlice(
	content: Array<JSONContent>,
	openStart: number,
	openEnd: number,
): Array<JSONContent> {
	// The slice's top-level nodes are the children of a parent open one level further.
	return cleanNodes(
		content.map((node) => stripMarkDeep(node, "underline")),
		{ start: openStart + 1, end: openEnd + 1 },
	);
}
