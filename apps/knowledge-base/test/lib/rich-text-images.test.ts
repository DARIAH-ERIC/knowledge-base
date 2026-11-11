import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { hasEmbeddedMedia } from "@/lib/rich-text-images";

function paragraph(text: string): JSONContent {
	return { type: "paragraph", content: [{ type: "text", text }] };
}

describe("hasEmbeddedMedia", () => {
	it("finds a pasted image at the top level", () => {
		expect(
			hasEmbeddedMedia({
				type: "doc",
				content: [
					paragraph("Text."),
					{ type: "image", attrs: { src: "https://example.com/a.jpg" } },
				],
			}),
		).toBe(true);
	});

	it("finds an asset image nested in a list, where no image block can hold it", () => {
		expect(
			hasEmbeddedMedia({
				type: "doc",
				content: [
					{
						type: "bulletList",
						content: [
							{
								type: "listItem",
								content: [paragraph("Item."), { type: "assetImage", attrs: { imageKey: "a" } }],
							},
						],
					},
				],
			}),
		).toBe(true);
	});

	it.each(["galleryBlock", "mediaTextBlock", "embedBlock"])(
		"finds a %s nested in a table cell, which the editor's schema does not allow",
		(type) => {
			expect(
				hasEmbeddedMedia({
					type: "doc",
					content: [
						{
							type: "table",
							content: [
								{
									type: "tableRow",
									content: [{ type: "tableCell", content: [{ type: "paragraph" }, { type }] }],
								},
							],
						},
					],
				}),
			).toBe(true);
		},
	);

	it("accepts text without images", () => {
		expect(hasEmbeddedMedia({ type: "doc", content: [paragraph("Only text.")] })).toBe(false);
		expect(hasEmbeddedMedia(null)).toBe(false);
	});
});
