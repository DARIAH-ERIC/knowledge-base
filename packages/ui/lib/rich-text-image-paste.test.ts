import { type JSONContent, getSchema } from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";

import { createRichTextExtensions } from "@/lib/rich-text-editor";
import { parsePastedImage, withoutPastedImages } from "@/lib/rich-text-image-paste";

const schema = getSchema(createRichTextExtensions());

function paragraph(text: string): JSONContent {
	return { type: "paragraph", content: [{ type: "text", text }] };
}

function placeholder(src: string): JSONContent {
	return { type: "assetImage", attrs: { sourceUrl: src } };
}

/** Enough of an `<img>` for the parse rule, which only reads attributes. */
function img(attributes: Record<string, string>): HTMLElement {
	return { getAttribute: (name: string) => attributes[name] ?? null } as unknown as HTMLElement;
}

function guard(nodes: Array<JSONContent>, withPlaceholders = true): Array<JSONContent> {
	const fragment = Fragment.fromArray(nodes.map((node) => schema.nodeFromJSON(node)));
	const result = withoutPastedImages(fragment, withPlaceholders);

	const json: Array<JSONContent> = [];
	result.forEach((node) => {
		node.check();
		json.push(node.toJSON() as JSONContent);
	});
	return json;
}

describe("the schema", () => {
	it("has no node that keeps an image's src", () => {
		expect(schema.nodes.image).toBeUndefined();
	});
});

describe("parsePastedImage", () => {
	it("parses an <img> as an empty image block that remembers its source", () => {
		expect(parsePastedImage(img({ src: "https://example.com/photo.jpg", alt: "A photo" }))).toEqual(
			{
				imageKey: null,
				imageUrl: null,
				alt: "A photo",
				sourceUrl: "https://example.com/photo.jpg",
			},
		);
	});

	it("ignores inline data and blob images", () => {
		expect(parsePastedImage(img({ src: "data:image/png;base64,AAAA" }))).toBeFalsy();
		expect(parsePastedImage(img({ src: "blob:https://example.com/1234" }))).toBeFalsy();
		expect(parsePastedImage(img({}))).toBeFalsy();
	});
});

describe("withoutPastedImages", () => {
	it("keeps a top-level placeholder", () => {
		const [before, image, after] = guard([
			paragraph("Before."),
			placeholder("https://example.com/photo.jpg"),
			paragraph("After."),
		]);

		expect(before).toStrictEqual(paragraph("Before."));
		expect(image).toMatchObject({
			type: "assetImage",
			attrs: { imageKey: null, sourceUrl: "https://example.com/photo.jpg" },
		});
		expect(after).toStrictEqual(paragraph("After."));
	});

	it("drops every placeholder where the editor offers no picker to fill it", () => {
		expect(
			guard([paragraph("Kept."), placeholder("https://example.com/photo.jpg")], false),
		).toStrictEqual([paragraph("Kept.")]);
	});

	it("keeps an image copied from the media library", () => {
		const [image] = guard([{ type: "assetImage", attrs: { imageKey: "images/a.jpg" } }], false);

		expect(image).toMatchObject({ type: "assetImage", attrs: { imageKey: "images/a.jpg" } });
	});

	it("drops a placeholder nested where an image block cannot live", () => {
		const list: JSONContent = {
			type: "bulletList",
			content: [
				{
					type: "listItem",
					content: [paragraph("Item."), placeholder("https://example.com/photo.jpg")],
				},
			],
		};

		expect(guard([list])).toStrictEqual([
			{
				type: "bulletList",
				content: [{ type: "listItem", content: [paragraph("Item.")] }],
			},
		]);
	});

	it("refills a container that held nothing but the image", () => {
		const table: JSONContent = {
			type: "table",
			content: [
				{
					type: "tableRow",
					content: [{ type: "tableCell", content: [placeholder("https://example.com/photo.jpg")] }],
				},
			],
		};

		const [result] = guard([table]);

		// `check` in `guard` has already proven the cell valid; it holds an empty paragraph now.
		expect(JSON.stringify(result)).not.toContain("example.com");
	});
});
