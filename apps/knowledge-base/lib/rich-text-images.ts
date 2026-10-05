import type { JSONContent } from "@tiptap/core";

/** The node types that put an image straight into a document instead of into an image block. */
const embeddedImageNodeTypes = new Set(["assetImage", "image"]);

/**
 * Whether a rich-text document holds an image of its own rather than leaving it to an image block.
 *
 * Every image on the site is an asset in the object store, referenced from an `image` (or gallery,
 * media) content block by its key. An image node inside a rich-text body is neither: a plain
 * `image` carries whatever `src` was pasted — usually someone else's server — and an `assetImage`
 * that ended up nested in a list or table keeps a signed url that expires, with no reference to the
 * asset at all. The editor's paste guard keeps both out; this is the check for everything else that
 * reaches the write path.
 */
export function hasEmbeddedImage(content: JSONContent | null | undefined): boolean {
	if (content == null) {
		return false;
	}
	if (content.type != null && embeddedImageNodeTypes.has(content.type)) {
		return true;
	}

	return (content.content ?? []).some((child) => hasEmbeddedImage(child));
}
