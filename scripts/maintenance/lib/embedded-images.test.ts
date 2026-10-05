import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { extractFromBody, hasEmbeddedImages, resolveParts, splitRichText } from "./embedded-images";

function paragraph(text: string): JSONContent {
	return { type: "paragraph", content: [{ type: "text", text }] };
}

function doc(...content: Array<JSONContent>): JSONContent {
	return { type: "doc", content };
}

function image(src: string, alt?: string): JSONContent {
	return { type: "image", attrs: { src, alt: alt ?? null } };
}

describe("hasEmbeddedImages", () => {
	it("finds plain and asset images at any depth", () => {
		expect(hasEmbeddedImages(doc(paragraph("a"), image("https://example.com/a.jpg")))).toBe(true);
		expect(
			hasEmbeddedImages(
				doc({
					type: "bulletList",
					content: [
						{ type: "listItem", content: [{ type: "assetImage", attrs: { imageKey: "k" } }] },
					],
				}),
			),
		).toBe(true);
		expect(hasEmbeddedImages(doc(paragraph("only text")))).toBe(false);
	});
});

describe("splitRichText", () => {
	it("splits a body at its top-level images, in place", () => {
		const parts = splitRichText(
			doc(paragraph("Before."), image("https://example.com/a.jpg", "A"), paragraph("After.")),
		);

		expect(parts).toEqual([
			{ kind: "rich_text", content: doc(paragraph("Before.")) },
			{
				kind: "image",
				image: {
					source: { kind: "url", src: "https://example.com/a.jpg" },
					alt: "A",
					caption: null,
					captionMode: "inherit",
					layout: "default",
					isNested: false,
				},
			},
			{ kind: "rich_text", content: doc(paragraph("After.")) },
		]);
	});

	it("keeps an asset image's caption and layout", () => {
		const caption = doc(paragraph("Caption."));
		const [part] = splitRichText(
			doc({
				type: "assetImage",
				attrs: { imageKey: "images/a.jpg", caption, captionMode: "override", layout: "wide" },
			}),
		);

		expect(part).toMatchObject({
			kind: "image",
			image: {
				source: { kind: "asset", imageKey: "images/a.jpg" },
				caption,
				captionMode: "override",
				layout: "wide",
			},
		});
	});

	it("places an image nested in a list after the list, leaving the item valid", () => {
		const list: JSONContent = {
			type: "bulletList",
			content: [
				{ type: "listItem", content: [paragraph("Item.")] },
				{ type: "listItem", content: [image("https://example.com/a.jpg")] },
			],
		};

		const parts = splitRichText(doc(list, paragraph("After.")));

		expect(parts.map((part) => part.kind)).toEqual(["rich_text", "image", "rich_text"]);
		expect(parts[0]).toEqual({
			kind: "rich_text",
			content: doc({
				type: "bulletList",
				content: [
					{ type: "listItem", content: [paragraph("Item.")] },
					{ type: "listItem", content: [{ type: "paragraph" }] },
				],
			}),
		});
		expect(parts[1]).toMatchObject({ image: { isNested: true } });
	});
});

describe("extractFromBody", () => {
	it("takes the images out of a media block's prose", () => {
		const result = extractFromBody(doc(paragraph("Bio."), image("https://example.com/a.jpg")));

		expect(result.content).toEqual(doc(paragraph("Bio.")));
		expect(result.images).toHaveLength(1);
	});

	it("leaves an empty paragraph rather than an empty body", () => {
		expect(extractFromBody(doc(image("https://example.com/a.jpg"))).content).toEqual(
			doc({ type: "paragraph" }),
		);
	});
});

describe("resolveParts", () => {
	const parts = splitRichText(
		doc(
			paragraph("Before."),
			image("https://example.com/found.jpg"),
			paragraph("Middle."),
			image("/relative.jpg"),
			paragraph("After."),
		),
	);

	it("leaves the body alone when any image is unresolved", () => {
		expect(resolveParts(parts, new Map([["url:https://example.com/found.jpg", "id"]]), false)).toBe(
			null,
		);
	});

	it("drops unresolved images on request, merging the prose around them", () => {
		const resolved = resolveParts(
			parts,
			new Map([["url:https://example.com/found.jpg", "asset-id"]]),
			true,
		);

		expect(resolved?.map((part) => part.kind)).toEqual(["rich_text", "image", "rich_text"]);
		expect(resolved?.[1]).toMatchObject({ assetId: "asset-id" });
		expect(resolved?.[2]).toEqual({
			kind: "rich_text",
			content: doc(paragraph("Middle."), paragraph("After.")),
		});
	});
});
