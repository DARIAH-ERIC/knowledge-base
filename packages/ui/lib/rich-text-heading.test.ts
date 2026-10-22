import { type JSONContent, getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";

import { createRichTextExtensions } from "@/lib/rich-text-editor";

const schema = getSchema(createRichTextExtensions());

function heading(...content: Array<JSONContent>): JSONContent {
	return { type: "heading", attrs: { level: 2 }, content };
}

function text(value: string, ...marks: Array<string>): JSONContent {
	return marks.length > 0
		? {
				type: "text",
				text: value,
				marks: marks.map((type) => {
					return { type };
				}),
			}
		: { type: "text", text: value };
}

describe("the heading node", () => {
	it("allows every mark but bold", () => {
		const heading = schema.nodes.heading!;

		expect(
			Object.values(schema.marks)
				.filter((mark) => heading.allowsMarkType(mark))
				.map((mark) => mark.name)
				.toSorted(),
		).toStrictEqual(
			Object.keys(schema.marks)
				.filter((name) => name !== "bold")
				.toSorted(),
		);
	});

	it("loses bold when a bold paragraph becomes a heading", () => {
		const doc = schema.nodeFromJSON({
			type: "doc",
			content: [{ type: "paragraph", content: [text("Title", "bold", "italic")] }],
		});
		const state = EditorState.create({ doc });
		const tr = state.tr.setBlockType(1, 1, schema.nodes.heading!, { level: 2 });

		// `toEqual`: ProseMirror's attribute objects have no prototype.
		expect(tr.doc.toJSON()).toEqual({
			type: "doc",
			content: [heading(text("Title", "italic"))],
		});
	});
});
