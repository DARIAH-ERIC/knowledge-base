import { formatPlaceholderValue } from "@dariah-eric/database/placeholder-values";
import type { JSONContent } from "@tiptap/core";

export { formatPlaceholderValue };

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object";
}

function appendBlockSeparator(parts: Array<string>) {
	// oxlint-disable-next-line prefer-at
	const lastPart = parts[parts.length - 1];

	if (lastPart !== "\n\n") {
		parts.push("\n\n");
	}
}

function visit(node: unknown, parts: Array<string>) {
	if (Array.isArray(node)) {
		for (const item of node) {
			visit(item, parts);
		}

		return;
	}

	if (!isRecord(node)) {
		return;
	}

	if (node.type === "hardBreak") {
		parts.push("\n");
		return;
	}

	if (node.type === "buttonLink" && isRecord(node.attrs) && typeof node.attrs.label === "string") {
		parts.push(node.attrs.label);
		return;
	}

	if (node.type === "footnote" && isRecord(node.attrs)) {
		// A footnote keeps its note in an attribute, which the content walk below never reaches. Flatten
		// it in place, padded, so the note is searchable alongside the sentence it belongs to instead of
		// running into the word before the marker.
		parts.push(" ");
		visit(node.attrs.content, parts);
		parts.push(" ");
		return;
	}

	if (node.type === "placeholderValue" && isRecord(node.attrs)) {
		// Annotated nodes flatten to their resolved value; raw references fall back to the display
		// label so search/alt text stays meaningful.
		const resolved = formatPlaceholderValue(node.attrs);
		const label = node.attrs.label ?? node.attrs.kind;
		const text = resolved ?? (typeof label === "string" ? label : null);
		if (text != null) {
			parts.push(text);
		}
		return;
	}

	if (typeof node.text === "string") {
		parts.push(node.text);
	}

	visit(node.content, parts);

	if (
		node.type === "blockquote" ||
		node.type === "bulletList" ||
		node.type === "codeBlock" ||
		node.type === "heading" ||
		node.type === "listItem" ||
		node.type === "orderedList" ||
		node.type === "paragraph"
	) {
		appendBlockSeparator(parts);
	}
}

/** Flatten Tiptap richtext JSON to plain text (used for `alt` fallbacks and search indexing). */
export function toPlainText(input: unknown): string {
	const parts: Array<string> = [];

	visit(input, parts);

	return parts
		.join("")
		.replaceAll(/\r\n?/g, "\n")
		.replaceAll(/[ \t]+\n/g, "\n")
		.replaceAll(/\n{3,}/g, "\n\n")
		.trim();
}

/**
 * Every footnote's note in reading order — which is the order the markers are numbered in.
 *
 * Accepts arbitrary JSON (one richtext document, the ordered content blocks of a whole article,
 * ...) and walks every value, like `collectLinkTargetAssetKeys` does, so a caller can hand over
 * whatever shape it holds. A footnote is never nested inside another (its note is written with the
 * caption editor, which has no footnote to offer), so walking everything cannot reorder the
 * result.
 *
 * Read paths use this to build the note list; the marker numbers come from the `footnotes` CSS
 * counter, and both count the same markers in the same order.
 */
export function collectFootnotes(input: unknown): Array<JSONContent | null> {
	const notes: Array<JSONContent | null> = [];

	function visit(node: unknown) {
		if (Array.isArray(node)) {
			for (const item of node) {
				visit(item);
			}
			return;
		}

		if (!isRecord(node)) {
			return;
		}

		if (node.type === "footnote") {
			notes.push(
				isRecord(node.attrs) ? ((node.attrs.content as JSONContent | null) ?? null) : null,
			);
			return;
		}

		for (const value of Object.values(node)) {
			visit(value);
		}
	}

	visit(input);

	return notes;
}

/**
 * Whether a richtext document carries no meaningful text. An empty editor still produces a `doc`
 * with a single empty paragraph, so callers persist `null` instead of storing that placeholder.
 */
export function isEmptyRichTextDocument(content: JSONContent | null | undefined): boolean {
	if (content == null) {
		return true;
	}
	if (content.type !== "doc") {
		return false;
	}

	const nodes = content.content ?? [];

	if (nodes.length === 0) {
		return true;
	}

	return nodes.every((node) => {
		if (node.type === "paragraph") {
			const paragraphContent = node.content ?? [];
			if (paragraphContent.length === 0) {
				return true;
			}

			return paragraphContent.every(
				(child) => child.type === "text" && (child.text ?? "").trim() === "",
			);
		}

		return false;
	});
}
