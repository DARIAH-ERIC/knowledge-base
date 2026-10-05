import { Extension } from "@tiptap/core";
import { Fragment, type Node as ProseMirrorNode, Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Pasted images, which are never stored as they come.
 *
 * Every image on the site is an asset in the object store, picked from the media library. Pasted
 * HTML — from a web page, a Google Doc, Word — carries `<img src="https://…">` instead. No node in
 * the schema keeps such a `src`: `assetImage` parses the tag as an empty placeholder that only
 * remembers where the image came from (`sourceUrl`), and its panel opens so the author can upload
 * the image and pick it.
 */

/** The `assetImage` attributes a pasted `<img>` parses to: no asset yet, and where it came from. */
export function parsePastedImage(element: HTMLElement): Record<string, unknown> | false {
	const src = element.getAttribute("src")?.trim();

	// An inline `data:` or `blob:` image has no address worth showing the author, and its bytes would
	// otherwise sit in the document; it is dropped like any other tag nothing parses.
	if (src == null || src === "" || /^(?:data|blob):/i.test(src)) {
		return false;
	}

	const alt = element.getAttribute("alt")?.trim();

	return {
		imageKey: null,
		imageUrl: null,
		alt: alt != null && alt !== "" ? alt : null,
		sourceUrl: src,
	};
}

function isPastedPlaceholder(node: ProseMirrorNode): boolean {
	return node.type.name === "assetImage" && node.attrs.sourceUrl != null;
}

/**
 * A fragment without the pasted-image placeholders that cannot stay: every one nested inside a list
 * item, a table cell or a quote, where an image block cannot be stored, and — without
 * `withPlaceholders`, in an editor that offers no picker to fill them — the top-level ones too.
 *
 * A container left without its required content by a dropped image is refilled with the minimum its
 * schema asks for — a table cell that held only an image becomes a cell with an empty paragraph,
 * not an invalid document.
 */
export function withoutPastedImages(
	fragment: Fragment,
	withPlaceholders: boolean,
	depth = 0,
): Fragment {
	const nodes: Array<ProseMirrorNode> = [];

	fragment.forEach((node) => {
		if (isPastedPlaceholder(node)) {
			if (depth === 0 && withPlaceholders) {
				nodes.push(node);
			}
			return;
		}
		if (node.isText || node.isLeaf) {
			nodes.push(node);
			return;
		}

		const content = withoutPastedImages(node.content, withPlaceholders, depth + 1);
		nodes.push(
			node.type.validContent(content)
				? node.copy(content)
				: (node.type.createAndFill(node.attrs, content, node.marks) ?? node.copy(content)),
		);
	});

	return Fragment.fromArray(nodes);
}

/**
 * Removes the pasted-image placeholders an editor cannot keep (see {@link withoutPastedImages}).
 * Covers drops too: ProseMirror sends dropped HTML through the same `transformPasted` hook.
 */
export const PastedImageGuard = Extension.create<{ withPlaceholders: boolean }>({
	name: "pastedImageGuard",

	addOptions() {
		return { withPlaceholders: true };
	},

	addProseMirrorPlugins() {
		const { withPlaceholders } = this.options;

		return [
			new Plugin({
				key: new PluginKey("pastedImageGuard"),
				props: {
					transformPasted(slice) {
						return new Slice(
							withoutPastedImages(slice.content, withPlaceholders),
							slice.openStart,
							slice.openEnd,
						);
					},
				},
			}),
		];
	},
});
