import { normalizeRichTextSlice } from "@dariah-eric/database/rich-text-normalize";
import { Extension, type JSONContent } from "@tiptap/core";
import { Fragment, type Schema, Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Pasted content, tidied as it arrives. Text copied from a web page, a Google Doc or Word brings
 * that source's layout along — `&nbsp;` for spacing, empty paragraphs for gaps, runs of `<br>`,
 * presentational attributes — and authors rarely notice it, because the editor shows it much like
 * the source did. Spacing is the website's to set, so none of it is kept.
 *
 * The rules are `normalizeRichTextDocument`'s, the ones the richtext cleanup applies to stored
 * content, so a paste is left as that cleanup would leave it rather than collecting findings for
 * it. Only what carries no meaning is changed: nothing is guessed, e.g. a bold line is never turned
 * into a heading.
 */
export function normalizePastedSlice(slice: Slice, schema: Schema): Slice {
	const json = slice.content.toJSON() as Array<JSONContent> | null;
	if (json == null) {
		return slice;
	}

	const normalized = normalizeRichTextSlice(json, slice.openStart, slice.openEnd);

	// A paste of nothing but spacing is taken as meant; one already clean needs no new slice.
	if (normalized.length === 0 || JSON.stringify(normalized) === JSON.stringify(json)) {
		return slice;
	}

	const content = Fragment.fromJSON(schema, normalized);

	// The rules were written for stored documents; where emptying a node leaves a container its
	// schema does not accept (a callout needs a block), the paste goes in as it came.
	if (isValid(slice.content) && !isValid(content)) {
		return slice;
	}

	return new Slice(content, slice.openStart, slice.openEnd);
}

function isValid(fragment: Fragment): boolean {
	try {
		fragment.forEach((node) => {
			node.check();
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Applies {@link normalizePastedSlice} to everything pasted, and to dropped HTML, which ProseMirror
 * sends through the same `transformPasted` hook.
 */
export const PastedContentNormalizer = Extension.create({
	name: "pastedContentNormalizer",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("pastedContentNormalizer"),
				props: {
					transformPasted(slice, view) {
						return normalizePastedSlice(slice, view.state.schema);
					},
				},
			}),
		];
	},
});
