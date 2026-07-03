import { resolveImageCaption } from "@dariah-eric/database/image-captions";
import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { mergeBlocksToDocument, splitDocumentToBlocks } from "@/lib/content-blocks-document";

const assetCaption: JSONContent = {
	type: "doc",
	content: [{ type: "paragraph", content: [{ type: "text", text: "Asset caption" }] }],
};
const blockCaption: JSONContent = {
	type: "doc",
	content: [{ type: "paragraph", content: [{ type: "text", text: "Block caption" }] }],
};

describe("resolveImageCaption", () => {
	it("inherits the asset caption", () => {
		expect(
			resolveImageCaption({ assetCaption, blockCaption, captionMode: "inherit" }),
		).toStrictEqual({ caption: assetCaption, source: "asset" });
	});

	it("uses a placement override", () => {
		expect(
			resolveImageCaption({ assetCaption, blockCaption, captionMode: "override" }),
		).toStrictEqual({ caption: blockCaption, source: "block" });
	});

	it("can suppress a caption for one placement", () => {
		expect(
			resolveImageCaption({ assetCaption, blockCaption, captionMode: "hidden" }),
		).toStrictEqual({
			caption: null,
			source: null,
		});
	});
});

describe("image content-block document conversion", () => {
	it("keeps inherited asset metadata separate from the placement override", () => {
		const document = mergeBlocksToDocument([
			{
				type: "image",
				content: {
					imageKey: "images/example.jpg",
					imageUrl: "https://example.com/image.jpg",
					alt: "Alternative text",
					assetCaption,
					caption: blockCaption,
					captionMode: "inherit",
				},
			},
		]);

		expect(document.content?.[0]?.attrs).toMatchObject({
			alt: "Alternative text",
			assetCaption,
			caption: blockCaption,
			captionMode: "inherit",
		});

		expect(splitDocumentToBlocks(document)[0]?.content).toMatchObject({
			alt: "Alternative text",
			assetCaption,
			caption: blockCaption,
			captionMode: "inherit",
		});
	});

	it("treats legacy non-null block captions as overrides", () => {
		const document = mergeBlocksToDocument([
			{
				type: "image",
				content: { imageKey: "images/example.jpg", caption: blockCaption },
			},
		]);

		expect(document.content?.[0]?.attrs?.captionMode).toBe("override");
	});
});

describe("callout content-block document conversion", () => {
	it("keeps callouts inline while round-tripping them as separate blocks", () => {
		const content: JSONContent = {
			type: "doc",
			content: [{ type: "paragraph", content: [{ type: "text", text: "Take care" }] }],
		};
		const document = mergeBlocksToDocument([
			{ type: "rich_text", content: blockCaption },
			{ type: "callout", content: { intent: "warning", title: "Important", content } },
			{ type: "rich_text", content: assetCaption },
		]);

		expect(document.content?.map((node) => node.type)).toStrictEqual([
			"paragraph",
			"calloutBlock",
			"paragraph",
		]);
		expect(splitDocumentToBlocks(document).map((block) => block.type)).toStrictEqual([
			"rich_text",
			"callout",
			"rich_text",
		]);
		expect(splitDocumentToBlocks(document)[1]?.content).toStrictEqual({
			intent: "warning",
			title: "Important",
			content,
		});
	});
});
