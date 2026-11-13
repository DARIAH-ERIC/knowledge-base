# Website: render images nested in lists and blockquotes

Handoff for the website side of images inside list items and blockquotes. The knowledge base and
its public API are done; this work happens in
[`DARIAH-ERIC/dariah-website`](https://github.com/DARIAH-ERIC/dariah-website).

## Background

Until now, every image on a page arrived as its own `image` content block. The editor's splitter
turns an image at the top of a document, or of a callout or accordion panel, into such a block
before saving, and the editor refused images anywhere else.

Editors can now put an image directly inside a list item (after its first paragraph), such as a
screenshot per step in a how-to, or inside a plain `blockquote`. A list item cannot be split out
into a block of its own without breaking the list, so such an image stays a node inside the
`rich_text` block's Tiptap JSON: an `assetImage` node. The api resolves it, so it arrives with the
same image fields an `image` block has.

Nothing else changes. Galleries, media-and-text and embeds still only arrive as content blocks,
and quotes with attribution (`quoteBlock`) still hold only paragraphs.

## What the api sends

`assetImage` appears inside the Tiptap JSON of a `rich_text` block's `content`, or of a
`media_text` block's body. Its parent is always a `listItem` or a `blockquote`. Because a list can
sit inside a table cell or a media-text body, so can the image, through its list item. The
resolution happens in the api (`annotateNestedImages` in `apps/api/src/lib/content-blocks.ts`); the
`rich_text` schema's description documents it too, so `generate:openapi` picks the wording up.

```jsonc
{
	"type": "bulletList",
	"content": [
		{
			"type": "listItem",
			"content": [
				{ "type": "paragraph", "content": [{ "type": "text", "text": "Open the dashboard." }] },
				{
					"type": "assetImage",
					"attrs": {
						// `BlockImage`: the api's usual `Image` shape without `caption`, the same as on an
						// `image` content block. Null when the asset has been deleted.
						"image": {
							"url": "https://…",
							"srcUrl": "https://…",
							"width": 1200,
							"height": 800,
							"alt": "The dashboard's start page",
							// …the rest of `Image`, minus `caption`
						},
						// Resolved the same way as an `image` block's: the asset's caption, the editor's own,
						// or none. `{ doc > paragraph }` richtext, or null.
						"caption": null,
						// "asset" | "block" | null, as on an `image` block.
						"captionSource": null,
					},
				},
			],
		},
	],
}
```

Guarantees:

- `attrs` has exactly `image`, `caption` and `captionSource`. No asset key, layout or signed editor
  url comes through.
- `image` is signed at the api's preview width (800px), the width a floated `image` block gets,
  because a nested image sits in the text column. `width`/`height` are the _source's_ dimensions.
- `image` may be null (the asset was deleted after the content was saved). Render nothing then,
  as the `image` content block does.
- A nested image has no layout: no wide, full-width or floated variants.

## What to build

1. **Schema**: declare the node in `createRichTextExtensions` (`lib/rich-text-extensions.ts`), with
   `group: "block"`, `atom: true`, and `image`, `caption` and `captionSource` attributes (default
   `null`). The static renderer drops an undeclared node or attribute when it reads the JSON, so
   this step is not optional. StarterKit's stock list item (`paragraph block*`) and blockquote
   (`block+`) then accept it as they are. Update the doc comment there, which says block-level
   images never arrive in richtext.
2. **Renderer**: add `assetImage` to `nodeMapping` in `components/rich-text.tsx`. Reuse the
   `image` case of `components/content-blocks.tsx` with its `default` layout: `asImage` to narrow
   `attrs.image` (return null when it is null), a `figure` with `ApiImage`, and `Caption` with
   `attrs.caption` and `image.license`. Beyond that:
   - `sizes` should match the text column it sits in, not the page's;
   - `alt` comes from `image.alt`, the asset's own alt text, so do not blank it as for decorative
     images;
   - in a list item, the figure follows the item's paragraph, inside the `li`, with spacing that
     matches the list's rhythm;
   - in a blockquote, keep the quote's panel styling around it. The image is part of the quotation.
3. **Plain text**: nothing to do. `toPlainText` in `lib/rich-text.ts` already yields nothing for a
   node without text content.
4. **Tests**: extend `tests/unit/rich-text.test.ts` with an image in a list item (with an asset
   caption), an image in a blockquote with the editor's own caption, an image whose `image` is null
   (renders nothing), and a hidden caption (`caption` and `captionSource` both null).

## Checking it against real content

No published content uses nested images yet. Author one in the knowledge base's dashboard: in a
list item or blockquote, open the insert menu or `/` slash menu and pick "Image". The image lands
in the item the cursor is in.

## Out of scope

- Layout variants for nested images: the editor offers none and the api sends none.
- Galleries, media-and-text and embeds in lists: the editor does not allow them.
