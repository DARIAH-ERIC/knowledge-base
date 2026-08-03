import type { JSONContent } from "@tiptap/core";

/**
 * Turns the hand-numbered references of a migrated impact case study into footnotes.
 *
 * WordPress had no footnote support, so authors built one by hand: `[1]`, `(2-3)` typed into the
 * prose, and a matching `[1] …` paragraph under an "Evidence of the Impact" heading at the end of
 * the article. Nothing tied the two together, and all three articles sampled before this was
 * written had drifted — numbers cited that no entry defines, entries no marker points at, brackets
 * in the list against parentheses in the prose.
 *
 * A footnote node carries its own note (see `FootnoteNode` in `@dariah-eric/ui`), so this pairs
 * each marker with its entry, replaces the marker text with the node, and takes the entry out of
 * the list — after which the numbering is positional and cannot drift again. Whatever cannot be
 * paired is left exactly as it is and reported instead: this fixes the mechanical half and hands
 * the editorial half to a human.
 *
 * Pure and idempotent: a second pass over converted content finds no markers and no entries left to
 * match, so it plans nothing.
 */

/** One `rich_text` content block of a single entity version, in document order. */
export interface ReferenceBlock {
	blockId: string;
	position: number;
	content: JSONContent | null;
}

export interface FootnoteConversion {
	/** The reference number as it was typed, e.g. `3` of `[3]`. */
	number: number;
	/** The marker text that was replaced, e.g. `[4, 5]` or `(10-11)`. */
	marker: string;
	/** The words around the marker, so a reviewer can judge the match without opening the article. */
	context: string;
}

export type FootnoteReviewKind =
	/** A note marked with `*` rather than a number — too ad hoc to pair automatically. */
	| "asterisk-note"
	/** Two entries claim the same number, so neither can be paired without guessing. */
	| "duplicate-entry"
	/** The prose cites a number the evidence list never defines. */
	| "missing-entry"
	/** The evidence list defines a number the prose never cites. */
	| "uncited-entry";

export interface FootnoteReview {
	kind: FootnoteReviewKind;
	/** The number involved, where the finding is about one. */
	number: number | null;
	detail: string;
}

export interface FootnoteBackfillPlan {
	/** Only the blocks whose content changed, ready to write back. */
	changes: Array<{ blockId: string; content: JSONContent }>;
	conversions: Array<FootnoteConversion>;
	reviews: Array<FootnoteReview>;
}

/** The heading that ends the prose and opens the reference list. */
const evidenceHeadingPattern = /^evidence\s+of\s+(the\s+)?impact$/i;

/** `[12] …` or `(12) …` at the start of a list entry. */
const entryLabelPattern = /^\s*[[(](\d{1,3})[\])]\s*/;

/**
 * A citation in the prose: `[3]`, `[4, 5]`, `(1)`, `(10-11)`.
 *
 * Both bracket styles are recognised because the articles use both, sometimes in the same one — the
 * UDigiSH study lists its evidence as `[1]` but cites it as `(1)`. What separates a parenthesised
 * citation from an ordinary parenthetical like `(2021)` or `(Spain)` is not the syntax but whether
 * the number resolves to an entry, which {@link planFootnoteBackfill} checks.
 */
const markerPattern = /\[(\d{1,3}(?:\s*[,–-]\s*\d{1,3})*)\]|\((\d{1,3}(?:\s*[,–-]\s*\d{1,3})*)\)/g;

/** A paragraph carrying an unnumbered `*` note, as opposed to a sentence that merely starts bold. */
const asteriskNotePattern = /^\*[^*\s]?\s*\S/;

/** How far apart the ends of a range may be before it is read as something other than `(10-11)`. */
const maximumRangeSpan = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object";
}

function nodeText(node: JSONContent): string {
	if (typeof node.text === "string") {
		return node.text;
	}
	return (node.content ?? []).map((child) => nodeText(child)).join("");
}

/** The numbers a marker's inner text names, expanding `10-11` into both ends. */
function readMarkerNumbers(inner: string): Array<number> | null {
	const numbers: Array<number> = [];

	for (const part of inner.split(",")) {
		const range = /^\s*(\d{1,3})\s*[–-]\s*(\d{1,3})\s*$/.exec(part);

		if (range != null) {
			const from = Number(range[1]);
			const to = Number(range[2]);
			if (to < from || to - from > maximumRangeSpan) {
				return null;
			}
			for (let n = from; n <= to; n += 1) {
				numbers.push(n);
			}
			continue;
		}

		const single = /^\s*(\d{1,3})\s*$/.exec(part);
		if (single == null) {
			return null;
		}
		numbers.push(Number(single[1]));
	}

	return numbers.length > 0 ? numbers : null;
}

/**
 * A paragraph's inline content split at its hard breaks.
 *
 * Entries are one per line, but a line is not always a paragraph: the UDigiSH study's last two
 * references share one, separated by the `<br>` the author typed. Splitting here means the parser
 * sees the lines the author saw.
 */
function splitAtHardBreaks(content: Array<JSONContent>): Array<Array<JSONContent>> {
	const runs: Array<Array<JSONContent>> = [[]];

	for (const node of content) {
		if (node.type === "hardBreak") {
			runs.push([]);
			continue;
		}
		runs.at(-1)!.push(node);
	}

	return runs;
}

/** Rejoins runs with the hard breaks that separated them. */
function joinWithHardBreaks(runs: Array<Array<JSONContent>>): Array<JSONContent> {
	return runs.flatMap((run, index) => (index === 0 ? run : [{ type: "hardBreak" }, ...run]));
}

interface Entry {
	number: number;
	/** The note itself: the entry line with its `[n]` label removed. */
	note: Array<JSONContent>;
}

/** Reads `[12] Author. Title. url` as an entry, or returns null when the line carries no label. */
function readEntry(run: Array<JSONContent>): Entry | null {
	const first = run[0];

	if (first == null || typeof first.text !== "string") {
		return null;
	}

	const label = entryLabelPattern.exec(first.text);

	if (label == null) {
		return null;
	}

	const remainder = first.text.slice(label[0].length);
	const note = remainder === "" ? run.slice(1) : [{ ...first, text: remainder }, ...run.slice(1)];

	// A bare `[12]` with nothing after it defines no note, so it is not an entry.
	if (note.every((node) => nodeText(node).trim() === "")) {
		return null;
	}

	return { number: Number(label[1]), note };
}

/** Wraps an entry's inline content as the single-paragraph document a footnote stores. */
function toNoteDocument(note: Array<JSONContent>): JSONContent {
	return { type: "doc", content: [{ type: "paragraph", content: note }] };
}

/** A flat view of the version's top-level nodes, which run across block boundaries. */
interface FlatNode {
	blockIndex: number;
	nodeIndex: number;
	node: JSONContent;
}

function flatten(blocks: Array<ReferenceBlock>): Array<FlatNode> {
	return blocks.flatMap((block, blockIndex) =>
		(block.content?.content ?? []).map((node, nodeIndex) => {
			return { blockIndex, nodeIndex, node };
		}),
	);
}

/**
 * Where the evidence list starts and ends, as indices into the flat node list.
 *
 * The migration splits a document into one block per run of text between images, so the list can
 * start in one block and the prose citing it live in another — the section is found across the
 * whole version, never per block.
 */
function findEvidenceSection(nodes: Array<FlatNode>): { start: number; end: number } | null {
	const start = nodes.findIndex(
		(entry) =>
			entry.node.type === "heading" &&
			evidenceHeadingPattern.test(nodeText(entry.node).replaceAll(/\s+/g, " ").trim()),
	);

	if (start === -1) {
		return null;
	}

	const rest = nodes.slice(start + 1).findIndex((entry) => entry.node.type === "heading");

	return { start, end: rest === -1 ? nodes.length : start + 1 + rest };
}

/** Twelve words of context either side of a marker, for the report. */
function contextAround(text: string, index: number, length: number): string {
	return text
		.slice(Math.max(0, index - 60), Math.min(text.length, index + length + 60))
		.replaceAll(/\s+/g, " ")
		.trim();
}

interface MarkerReplacement {
	content: Array<JSONContent>;
	conversions: Array<FootnoteConversion>;
	missing: Array<{ number: number; context: string }>;
}

/**
 * Replaces every resolvable citation in a text node with footnote nodes carrying their notes.
 *
 * A marker whose numbers do not all resolve is left as it stands: a bracketed one is a citation
 * whose entry is missing (reported), and a parenthesised one is most likely not a citation at all —
 * `(2021)` and `(Spain)` are everywhere in these articles, and a year that happened to fall inside
 * the numbering would be indistinguishable except by this test.
 */
function replaceMarkersInText(
	node: JSONContent,
	entries: Map<number, Entry>,
	cited: Set<number>,
): MarkerReplacement {
	const text = node.text ?? "";
	const content: Array<JSONContent> = [];
	const conversions: Array<FootnoteConversion> = [];
	const missing: Array<{ number: number; context: string }> = [];

	let lastIndex = 0;

	markerPattern.lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = markerPattern.exec(text)) !== null) {
		const isBracketed = match[1] != null;
		const numbers = readMarkerNumbers(match[1] ?? match[2]!);

		if (numbers == null) {
			continue;
		}

		const unresolved = numbers.filter((number) => !entries.has(number));

		if (unresolved.length > 0) {
			if (isBracketed) {
				for (const number of unresolved) {
					missing.push({ number, context: contextAround(text, match.index, match[0].length) });
				}
			}
			continue;
		}

		if (match.index > lastIndex) {
			content.push({ ...node, text: text.slice(lastIndex, match.index) });
		}

		for (const number of numbers) {
			content.push({
				type: "footnote",
				attrs: { content: toNoteDocument(entries.get(number)!.note) },
			});
			cited.add(number);
			conversions.push({
				number,
				marker: match[0],
				context: contextAround(text, match.index, match[0].length),
			});
		}

		lastIndex = match.index + match[0].length;
	}

	if (conversions.length === 0) {
		return { content: [node], conversions, missing };
	}

	if (lastIndex < text.length) {
		content.push({ ...node, text: text.slice(lastIndex) });
	}

	return { content, conversions, missing };
}

/**
 * Walks a run of nodes, replacing markers wherever text appears.
 *
 * Returns a list rather than a node apiece, because a text node holding a marker comes back as the
 * text before it, the footnote, and the text after — which is also why the recursion rebuilds each
 * parent's content with `flatMap`.
 */
function replaceMarkers(
	nodes: Array<JSONContent>,
	entries: Map<number, Entry>,
	cited: Set<number>,
	conversions: Array<FootnoteConversion>,
	missing: Array<{ number: number; context: string }>,
): Array<JSONContent> {
	return nodes.flatMap((node) => {
		if (typeof node.text === "string") {
			const replacement = replaceMarkersInText(node, entries, cited);
			conversions.push(...replacement.conversions);
			missing.push(...replacement.missing);
			return replacement.content;
		}

		if (node.content == null) {
			return [node];
		}

		return [
			{ ...node, content: replaceMarkers(node.content, entries, cited, conversions, missing) },
		];
	});
}

export function planFootnoteBackfill(blocks: Array<ReferenceBlock>): FootnoteBackfillPlan | null {
	const ordered = blocks.toSorted((a, b) => a.position - b.position);
	const nodes = flatten(ordered);
	const section = findEvidenceSection(nodes);

	if (section == null) {
		return null;
	}

	const reviews: Array<FootnoteReview> = [];

	/** Entry lines of the section, in order, keyed by number. */
	const entries = new Map<number, Entry>();
	const duplicates = new Set<number>();

	for (const flat of nodes.slice(section.start + 1, section.end)) {
		if (flat.node.type !== "paragraph") {
			continue;
		}
		for (const run of splitAtHardBreaks(flat.node.content ?? [])) {
			const entry = readEntry(run);
			if (entry == null) {
				continue;
			}
			if (entries.has(entry.number)) {
				duplicates.add(entry.number);
				continue;
			}
			entries.set(entry.number, entry);
		}
	}

	// An ambiguous number cannot be paired with a marker without guessing which entry was meant.
	for (const number of duplicates) {
		entries.delete(number);
		reviews.push({
			kind: "duplicate-entry",
			number,
			detail: `The evidence list defines [${String(number)}] more than once.`,
		});
	}

	if (entries.size === 0) {
		// Nothing left to pair markers with — but an ambiguous list is itself worth reporting.
		return reviews.length > 0 ? { changes: [], conversions: [], reviews } : null;
	}

	const conversions: Array<FootnoteConversion> = [];
	const missing: Array<{ number: number; context: string }> = [];
	const cited = new Set<number>();

	/** Rewritten top-level nodes, keyed by their place in the flat list; absent means unchanged. */
	const rewritten = new Map<number, JSONContent | null>();

	for (const [index, flat] of nodes.entries()) {
		if (index >= section.start && index < section.end) {
			continue;
		}

		if (
			flat.node.type === "paragraph" &&
			asteriskNotePattern.test(nodeText(flat.node).trimStart())
		) {
			reviews.push({
				kind: "asterisk-note",
				number: null,
				detail: nodeText(flat.node).replaceAll(/\s+/g, " ").trim().slice(0, 200),
			});
		}

		const before = JSON.stringify(flat.node);
		// A top-level node is a block — a paragraph, a heading, a list — so it always comes back as one.
		const next = replaceMarkers([flat.node], entries, cited, conversions, missing)[0] ?? flat.node;

		if (JSON.stringify(next) !== before) {
			rewritten.set(index, next);
		}
	}

	for (const { number, context } of missing) {
		reviews.push({
			kind: "missing-entry",
			number,
			detail: `Cited as [${String(number)}] but the evidence list defines no such entry: “${context}”`,
		});
	}

	// Entries whose marker was converted have moved into the prose, so they come out of the list;
	// the rest stay exactly where they are, and are reported.
	for (const [number, entry] of entries) {
		if (cited.has(number)) {
			continue;
		}
		reviews.push({
			kind: "uncited-entry",
			number,
			detail: `Listed as [${String(number)}] but no marker in the prose cites it: “${nodeText({
				type: "paragraph",
				content: entry.note,
			})
				.replaceAll(/\s+/g, " ")
				.trim()
				.slice(0, 200)}”`,
		});
	}

	if (cited.size === 0) {
		return conversions.length === 0 && reviews.length === 0
			? null
			: { changes: [], conversions, reviews };
	}

	for (const [index, flat] of nodes.entries()) {
		if (index <= section.start || index >= section.end || flat.node.type !== "paragraph") {
			continue;
		}

		const runs = splitAtHardBreaks(flat.node.content ?? []);
		const kept = runs.filter((run) => {
			const entry = readEntry(run);
			return entry == null || !cited.has(entry.number);
		});

		if (kept.length === runs.length) {
			continue;
		}

		rewritten.set(
			index,
			kept.length === 0 ? null : { ...flat.node, content: joinWithHardBreaks(kept) },
		);
	}

	// With every entry converted the heading names an empty section, so it goes too — along with the
	// rules that fenced it off, which would otherwise stack up where it stood.
	const sectionIsEmpty = nodes
		.slice(section.start + 1, section.end)
		.every(
			(flat, offset) =>
				rewritten.get(section.start + 1 + offset) === null || flat.node.type === "horizontalRule",
		);

	if (sectionIsEmpty) {
		for (let index = section.start; index < section.end; index += 1) {
			rewritten.set(index, null);
		}
	}

	const changes: Array<{ blockId: string; content: JSONContent }> = [];

	for (const [blockIndex, block] of ordered.entries()) {
		const original = block.content?.content;

		if (original == null) {
			continue;
		}

		const indices = nodes
			.map((flat, index) => (flat.blockIndex === blockIndex ? index : -1))
			.filter((index) => index !== -1);

		if (!indices.some((index) => rewritten.has(index))) {
			continue;
		}

		const content = indices
			// A rewritten entry of `null` is a node the plan removed, as opposed to one it left alone.
			.map((index) => (rewritten.has(index) ? (rewritten.get(index) ?? null) : nodes[index]!.node))
			.filter((node): node is JSONContent => node != null)
			// A rule that lost the section it separated leaves a duplicate behind.
			.filter(
				(node, index, all) =>
					node.type !== "horizontalRule" || all[index - 1]?.type !== "horizontalRule",
			);

		changes.push({ blockId: block.blockId, content: { ...block.content, content } });
	}

	return { changes, conversions, reviews };
}

/** Whether a value looks like a stored richtext document, for the script's row mapping. */
export function isRichTextDocument(value: unknown): value is JSONContent {
	return isRecord(value) && value.type === "doc";
}
