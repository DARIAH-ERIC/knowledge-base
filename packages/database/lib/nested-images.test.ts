import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import {
	collectNestedImageKeys,
	findDisallowedMedia,
	mapNestedImages,
	stripNestedImageDisplayAttrs,
} from "./nested-images";

function paragraph(text: string): JSONContent {
	return { type: "paragraph", content: [{ type: "text", text }] };
}

function image(attrs: Record<string, unknown>): JSONContent {
	return { type: "assetImage", attrs };
}

function list(...items: Array<Array<JSONContent>>): JSONContent {
	return {
		type: "bulletList",
		content: items.map((content) => {
			return { type: "listItem", content };
		}),
	};
}

function doc(...content: Array<JSONContent>): JSONContent {
	return { type: "doc", content };
}

describe("findDisallowedMedia", () => {
	it("accepts an image with a key directly inside a list item or a blockquote", () => {
		expect(
			findDisallowedMedia(
				doc(list([paragraph("Step."), image({ imageKey: "images/a.jpg" })]), {
					type: "blockquote",
					content: [image({ imageKey: "images/b.jpg" })],
				}),
			),
		).toStrictEqual([]);
	});

	it("reports an image at the top of the body, which the splitter should have made a block", () => {
		expect(findDisallowedMedia(doc(image({ imageKey: "images/a.jpg" })))).toStrictEqual([
			{ type: "assetImage", parentType: null },
		]);
	});

	it("reports an image without an asset, such as an unfilled pasted placeholder", () => {
		expect(
			findDisallowedMedia(
				doc(list([paragraph("Step."), image({ imageKey: null, sourceUrl: "https://x.test/a" })])),
			),
		).toStrictEqual([{ type: "assetImage", parentType: "listItem" }]);
	});

	it("reports other media in a list, and any media in a table cell, by its direct parent", () => {
		expect(
			findDisallowedMedia(
				doc(
					list([paragraph("Step."), { type: "galleryBlock", attrs: { items: [] } }]),
					{
						type: "table",
						content: [
							{
								type: "tableRow",
								content: [{ type: "tableCell", content: [image({ imageKey: "images/a.jpg" })] }],
							},
						],
					},
					{ type: "image", attrs: { src: "https://x.test/a.jpg" } },
				),
			),
		).toStrictEqual([
			{ type: "galleryBlock", parentType: "listItem" },
			{ type: "assetImage", parentType: "tableCell" },
			{ type: "image", parentType: null },
		]);
	});
});

describe("collectNestedImageKeys", () => {
	it("collects every image key, ignoring images without one", () => {
		const content = doc(list([paragraph("Step."), image({ imageKey: "images/a.jpg" })]), {
			type: "blockquote",
			content: [image({ imageKey: "images/b.jpg" }), image({ imageKey: null })],
		});

		expect(collectNestedImageKeys([{ content }])).toStrictEqual(
			new Set(["images/a.jpg", "images/b.jpg"]),
		);
	});
});

describe("stripNestedImageDisplayAttrs", () => {
	it("keeps only the key, caption and caption mode", () => {
		const content = doc(
			list([
				paragraph("Step."),
				image({
					imageKey: "images/a.jpg",
					imageUrl: "https://signed.test/a.jpg",
					alt: "Alt",
					assetCaption: { type: "doc" },
					caption: null,
					captionMode: "inherit",
					layout: "wide",
				}),
			]),
		);

		expect(collectNestedImageKeys(content)).toStrictEqual(new Set(["images/a.jpg"]));
		expect(JSON.stringify(stripNestedImageDisplayAttrs(content))).toBe(
			JSON.stringify(
				doc(
					list([
						paragraph("Step."),
						image({ imageKey: "images/a.jpg", caption: null, captionMode: "inherit" }),
					]),
				),
			),
		);
	});

	it("returns the value itself when there is nothing to strip", () => {
		const content = doc(paragraph("Only text."));

		expect(stripNestedImageDisplayAttrs(content)).toBe(content);
	});
});

describe("mapNestedImages", () => {
	it("copies only along the path to a changed image", () => {
		const untouched = paragraph("Untouched.");
		const content = doc(untouched, list([paragraph("Step."), image({ imageKey: "images/a.jpg" })]));

		const result = mapNestedImages(content, (attrs) => {
			return { ...attrs, imageUrl: "https://signed.test/a.jpg" };
		});

		expect(result).not.toBe(content);
		expect(result.content![0]).toBe(untouched);
		expect(JSON.stringify(result)).toContain("https://signed.test/a.jpg");
	});
});
