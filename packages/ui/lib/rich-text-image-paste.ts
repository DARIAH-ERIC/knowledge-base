import { Extension } from "@tiptap/core";
import { Fragment, type Node as ProseMirrorNode, type Schema, Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * A fragment with every plain `image` node replaced: at the top level by an empty `assetImage`
 * placeholder that remembers where the image came from, deeper down (inside a list item, a table
 * cell, a blockquote) by nothing, since an image block cannot live there. Without
 * `withPlaceholders` — an editor that offers no image picker — every one is dropped.
 *
 * A container left without its required content by a dropped image is refilled with the minimum its
 * schema asks for — a table cell that held only an image becomes a cell with an empty paragraph,
 * not an invalid document.
 */
export function withoutExternalImages(
	fragment: Fragment,
	schema: Schema,
	withPlaceholders: boolean,
	depth = 0,
): Fragment {
	const placeholder = withPlaceholders ? schema.nodes.assetImage : undefined;
	const nodes: Array<ProseMirrorNode> = [];

	fragment.forEach((node) => {
		if (node.type.name === "image") {
			if (depth === 0 && placeholder != null) {
				nodes.push(
					placeholder.create({
						alt: (node.attrs.alt as string | null | undefined) ?? null,
						sourceUrl: (node.attrs.src as string | null | undefined) ?? null,
					}),
				);
			}
			return;
		}
		if (node.isText || node.isLeaf) {
			nodes.push(node);
			return;
		}

		const content = withoutExternalImages(node.content, schema, withPlaceholders, depth + 1);
		nodes.push(
			node.type.validContent(content)
				? node.copy(content)
				: (node.type.createAndFill(node.attrs, content, node.marks) ?? node.copy(content)),
		);
	});

	return Fragment.fromArray(nodes);
}

/**
 * Keeps pasted and dropped `<img>` tags from becoming images that point at someone else's server.
 *
 * Every image on the site is an asset in the object store, picked from the media library. Pasted
 * HTML — from a web page, a Google Doc, Word — carries `<img src="https://…">` instead, which would
 * otherwise be stored as-is and hotlinked. Each one becomes an empty image block in its place,
 * which opens its picker so the author can upload the image and pick it, with the original address
 * shown for reference.
 *
 * A guard rather than a smaller schema, like `FootnotePasteGuard`: the plain `image` node stays in
 * the schema so documents that already hold one still open and render.
 */
export const ExternalImagePasteGuard = Extension.create<{ withPlaceholders: boolean }>({
	name: "externalImagePasteGuard",

	addOptions() {
		return { withPlaceholders: true };
	},

	addProseMirrorPlugins() {
		const { schema } = this.editor;
		const { withPlaceholders } = this.options;

		return [
			new Plugin({
				key: new PluginKey("externalImagePasteGuard"),
				props: {
					transformPasted(slice) {
						return new Slice(
							withoutExternalImages(slice.content, schema, withPlaceholders),
							slice.openStart,
							slice.openEnd,
						);
					},
				},
			}),
		];
	},
});
