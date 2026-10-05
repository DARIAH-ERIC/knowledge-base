import { type JSONContent, getSchema } from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";

import { createRichTextExtensions } from "@/lib/rich-text-editor";
import { withoutExternalImages } from "@/lib/rich-text-image-paste";

const schema = getSchema(createRichTextExtensions());

function paragraph(text: string): JSONContent {
	return { type: "paragraph", content: [{ type: "text", text }] };
}

function image(src: string, alt: string | null = null): JSONContent {
	return { type: "image", attrs: { src, alt } };
}

function guard(nodes: Array<JSONContent>, withPlaceholders = true): Array<JSONContent> {
	const fragment = Fragment.fromArray(nodes.map((node) => schema.nodeFromJSON(node)));
	const result = withoutExternalImages(fragment, schema, withPlaceholders);

	const json: Array<JSONContent> = [];
	result.forEach((node) => {
		node.check();
		json.push(node.toJSON() as JSONContent);
	});
	return json;
}

describe("withoutExternalImages", () => {
	it("replaces a pasted image with an empty image block that remembers its source", () => {
		const [before, placeholder, after] = guard([
			paragraph("Before."),
			image("https://example.com/photo.jpg", "A photo"),
			paragraph("After."),
		]);

		expect(before).toStrictEqual(paragraph("Before."));
		expect(placeholder?.type).toBe("assetImage");
		expect(placeholder?.attrs).toMatchObject({
			imageKey: null,
			imageUrl: null,
			alt: "A photo",
			sourceUrl: "https://example.com/photo.jpg",
		});
		expect(after).toStrictEqual(paragraph("After."));
	});

	it("drops every image where the editor offers no picker to fill a placeholder", () => {
		expect(
			guard([paragraph("Kept."), image("https://example.com/photo.jpg")], false),
		).toStrictEqual([paragraph("Kept.")]);
	});

	it("drops an image nested where an image block cannot live", () => {
		const list: JSONContent = {
			type: "bulletList",
			content: [
				{
					type: "listItem",
					content: [paragraph("Item."), image("https://example.com/photo.jpg")],
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
					content: [{ type: "tableCell", content: [image("https://example.com/photo.jpg")] }],
				},
			],
		};

		const [result] = guard([table]);

		// `check` in `guard` has already proven the cell valid; it holds an empty paragraph now.
		expect(JSON.stringify(result)).not.toContain("example.com");
	});

	it("leaves content without images untouched", () => {
		expect(guard([paragraph("Only text.")])).toStrictEqual([paragraph("Only text.")]);
	});
});
