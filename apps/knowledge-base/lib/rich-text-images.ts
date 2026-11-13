import { findDisallowedMedia } from "@dariah-eric/database/nested-images";
import type { JSONContent } from "@tiptap/core";

/**
 * Whether a rich-text body holds media it may not, rather than leaving it to a content block.
 *
 * Every image on the site is an asset in the object store, referenced by a foreign key. The
 * editor's splitter turns each media node at the top of a document, or of a callout or accordion
 * panel, into a typed block before saving, and the one media node its schema allows anywhere else
 * is an image directly inside a list item or a plain blockquote, which keeps its asset key (covered
 * by a foreign key through `content_block_assets`). Anything else did not come from the editor as
 * it is: a plain `image` carrying whatever `src` it came with, a pasted placeholder with no asset
 * yet, a gallery, embed or media-text block the public api would pass through unresolved. This is
 * the check for everything that reaches the write path; that each image key names an asset is
 * checked there too.
 */
export function hasEmbeddedMedia(content: JSONContent | null | undefined): boolean {
	return content != null && findDisallowedMedia(content).length > 0;
}
