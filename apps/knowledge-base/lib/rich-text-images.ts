import type { JSONContent } from "@tiptap/core";

/**
 * The node types that put media straight into a document instead of into a typed content block: the
 * editor's media nodes, and the stock `image` node it no longer has.
 */
const embeddedMediaNodeTypes = new Set([
	"assetImage",
	"embedBlock",
	"galleryBlock",
	"image",
	"mediaTextBlock",
]);

/**
 * Whether a rich-text document holds media of its own rather than leaving it to a content block.
 *
 * Every image on the site is an asset in the object store, referenced from an `image` (or gallery,
 * media) content block by a foreign key. The editor's splitter turns each media node at the top of
 * a document, or of a callout or accordion panel, into such a block before saving, and its schema
 * allows them nowhere else — so a media node still inside a `rich_text` or `media_text` body did
 * not come from the editor as it is. A plain `image` (nothing stops a hand-built payload from
 * sending one) carries whatever `src` it came with; an `assetImage` keeps a signed url that expires
 * with no reference to the asset at all — or, as a pasted placeholder, no asset yet; and a nested
 * gallery, embed or media-text block is an editor node the public api passes through unresolved.
 * This is the check for everything that reaches the write path.
 */
export function hasEmbeddedMedia(content: JSONContent | null | undefined): boolean {
	if (content == null) {
		return false;
	}
	if (content.type != null && embeddedMediaNodeTypes.has(content.type)) {
		return true;
	}

	return (content.content ?? []).some((child) => hasEmbeddedMedia(child));
}
