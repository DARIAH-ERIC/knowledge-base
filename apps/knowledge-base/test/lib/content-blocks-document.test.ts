import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import {
	type MergeableBlock,
	mergeBlocksToDocument,
	splitDocumentToBlocks,
} from "@/lib/content-blocks-document";

function paragraph(text: string): JSONContent {
	return { type: "paragraph", content: [{ type: "text", text }] };
}

function caption(text: string): JSONContent {
	return { type: "doc", content: [paragraph(text)] };
}

/**
 * Every block type the unified editor inlines, with each stored field set to a _non-default_ value.
 *
 * Defaults are the trap: a field that the merge/split seam forgets still round-trips to something
 * plausible, so the loss only shows up in production as content quietly reverting. That is exactly
 * how image `layout` was lost — added to the block in #787, never taught to the `assetImage` node,
 * and reset to `"default"` by `upsertTypedContentBlock` on the next save of any entity containing
 * one. Keep every value here distinguishable from the default it would decay to.
 */
const blocks = {
	image: {
		type: "image",
		content: {
			imageKey: "images/hero.jpg",
			imageUrl: "https://example.com/hero.jpg",
			alt: "A bursary winner",
			assetCaption: caption("Asset caption."),
			caption: caption("Block caption."),
			captionMode: "override",
			layout: "float-start",
		},
	},
	embed: {
		type: "embed",
		content: {
			url: "https://www.youtube.com/watch?v=abc123",
			title: "Recording of the session",
			caption: caption("Embed caption."),
		},
	},
	callout: {
		type: "callout",
		content: {
			intent: "warning",
			title: "Deadline moved",
			content: caption("The call now closes in March."),
		},
	},
	media_text: {
		type: "media_text",
		content: {
			imageKey: "images/ada.jpg",
			imageUrl: "https://example.com/ada.jpg",
			alt: "Ada Lovelace",
			assetCaption: caption("Portrait."),
			caption: caption("Custom portrait caption."),
			captionMode: "override",
			side: "end",
			content: { type: "doc", content: [paragraph("Ada chairs the working group.")] },
		},
	},
} satisfies Record<string, MergeableBlock>;

describe("merge/split round trip", () => {
	for (const [name, block] of Object.entries<MergeableBlock>(blocks)) {
		it(`preserves every stored field of a ${name} block`, () => {
			const [result] = splitDocumentToBlocks(mergeBlocksToDocument([block]));

			expect(result?.type).toBe(block.type);
			expect(result?.content).toMatchObject(block.content!);
		});
	}

	it("keeps blocks in order and does not merge across a typed block", () => {
		const doc = mergeBlocksToDocument([
			{ type: "rich_text", content: { type: "doc", content: [paragraph("Before.")] } },
			blocks.image,
			{ type: "rich_text", content: { type: "doc", content: [paragraph("After.")] } },
		]);

		expect(splitDocumentToBlocks(doc).map((block) => block.type)).toEqual([
			"rich_text",
			"image",
			"rich_text",
		]);
	});
});

describe("image layout", () => {
	// The regression behind the reported bug: a floated image in an existing entity was reset to
	// `default` the first time an editor opened and saved the page.
	it("survives a load/save cycle without an edit", () => {
		const stored: MergeableBlock = {
			type: "image",
			content: { imageKey: "images/a.jpg", layout: "float-end", captionMode: "inherit" },
		};

		const [result] = splitDocumentToBlocks(mergeBlocksToDocument([stored]));

		expect(result?.content).toMatchObject({ layout: "float-end" });
	});

	it("falls back to the default layout for an unknown stored value", () => {
		const doc: JSONContent = {
			type: "doc",
			content: [{ type: "assetImage", attrs: { imageKey: "images/a.jpg", layout: "centre" } }],
		};

		expect(splitDocumentToBlocks(doc)[0]?.content).toMatchObject({ layout: "default" });
	});
});

describe("richtext features inside a unified document", () => {
	// Tables, button links, asset (download) links, entity link targets and placeholder values all
	// live inside `rich_text` runs. The seam must pass them through untouched — it has no business
	// knowing about them, and a change to how runs are flushed could silently drop or reshape them.
	const richTextNodes: Array<JSONContent> = [
		{
			type: "table",
			content: [
				{
					type: "tableRow",
					content: [
						{ type: "tableHeader", content: [paragraph("Term")] },
						{ type: "tableCell", content: [paragraph("Meaning")] },
					],
				},
			],
		},
		{
			type: "buttonLink",
			attrs: { href: "https://example.com", label: "Apply", variant: "primary" },
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "the guidelines",
					marks: [
						{
							type: "link",
							attrs: { href: null, targetKind: "asset", assetKey: "documents/guidelines.pdf" },
						},
					],
				},
				{
					type: "text",
					text: "the about page",
					marks: [
						{
							type: "link",
							attrs: { href: null, targetKind: "entity", entityId: "01JABCDEF" },
						},
					],
				},
			],
		},
		{ type: "placeholderValue", attrs: { kind: "memberCount", label: "Member count" } },
	];

	it("passes tables, button links, link targets and placeholders through unchanged", () => {
		const block: MergeableBlock = {
			type: "rich_text",
			content: { type: "doc", content: richTextNodes },
		};

		const [result] = splitDocumentToBlocks(mergeBlocksToDocument([block]));

		expect(result?.type).toBe("rich_text");
		expect(result?.content).toEqual({ type: "doc", content: richTextNodes });
	});
});

describe("blocks that cannot be stored", () => {
	// `upsertTypedContentBlock` skips a media block with no asset to bind to, so keeping the node
	// would silently drop whatever the author had already written into it.
	it("demotes a media_text block with no image to rich text rather than losing its prose", () => {
		const doc: JSONContent = {
			type: "doc",
			content: [
				paragraph("Before."),
				{
					type: "mediaTextBlock",
					attrs: { imageKey: null, side: "start", captionMode: "inherit" },
					content: [paragraph("Orphaned bio.")],
				},
				paragraph("After."),
			],
		};

		const blocks = splitDocumentToBlocks(doc);

		expect(blocks).toHaveLength(1);
		expect(blocks[0]!.type).toBe("rich_text");
		expect(blocks[0]!.content).toEqual({
			type: "doc",
			content: [paragraph("Before."), paragraph("Orphaned bio."), paragraph("After.")],
		});
	});

	it("gives an author a paragraph to type into when a stored media_text body is empty", () => {
		const doc = mergeBlocksToDocument([
			{ ...blocks.media_text, content: { ...blocks.media_text.content, content: undefined } },
		]);

		expect(doc.content![0]!.content).toEqual([{ type: "paragraph" }]);
	});
});
