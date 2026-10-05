import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { hasEmbeddedImage } from "@/lib/rich-text-images";

function paragraph(text: string): JSONContent {
	return { type: "paragraph", content: [{ type: "text", text }] };
}

describe("hasEmbeddedImage", () => {
	it("finds a pasted image at the top level", () => {
		expect(
			hasEmbeddedImage({
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
			hasEmbeddedImage({
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

	it("accepts text without images", () => {
		expect(hasEmbeddedImage({ type: "doc", content: [paragraph("Only text.")] })).toBe(false);
		expect(hasEmbeddedImage(null)).toBe(false);
	});
});
