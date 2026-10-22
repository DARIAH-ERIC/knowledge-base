import { type JSONContent, getSchema } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";

import { createRichTextExtensions } from "@/lib/rich-text-editor";
import { normalizePastedSlice } from "@/lib/rich-text-paste-normalize";

const schema = getSchema(createRichTextExtensions());

function paragraph(text?: string): JSONContent {
	return text == null
		? { type: "paragraph" }
		: { type: "paragraph", content: [{ type: "text", text }] };
}

function slice(nodes: Array<JSONContent>, openStart: number, openEnd: number): Slice {
	return new Slice(
		Fragment.fromArray(nodes.map((node) => schema.nodeFromJSON(node))),
		openStart,
		openEnd,
	);
}

function contentOf(result: Slice): Array<JSONContent> {
	return (result.content.toJSON() as Array<JSONContent> | null) ?? [];
}

/** The document after pasting `pasted` at `position` of a document holding `content`. */
function paste(content: Array<JSONContent>, position: number, pasted: Slice): JSONContent {
	const doc = schema.nodeFromJSON({ type: "doc", content });
	const state = EditorState.create({ doc, selection: TextSelection.create(doc, position) });

	return state.tr
		.replaceSelection(normalizePastedSlice(pasted, schema))
		.doc.toJSON() as JSONContent;
}

describe("normalizePastedSlice", () => {
	it("drops the spacing a word processor pastes between paragraphs", () => {
		const result = normalizePastedSlice(
			slice([paragraph("One"), paragraph(" "), paragraph(), paragraph("Two")], 1, 1),
			schema,
		);

		expect(contentOf(result)).toStrictEqual([paragraph("One"), paragraph("Two")]);
		expect([result.openStart, result.openEnd]).toStrictEqual([1, 1]);
	});

	it("returns a clean slice as it is", () => {
		const pasted = slice([paragraph("One"), paragraph("Two")], 1, 1);

		expect(normalizePastedSlice(pasted, schema)).toBe(pasted);
	});

	it("keeps a paste of nothing but spacing", () => {
		const pasted = slice([paragraph(), paragraph()], 0, 0);

		expect(normalizePastedSlice(pasted, schema)).toBe(pasted);
	});

	it("keeps the space where pasted text meets the author's", () => {
		expect(
			paste([paragraph("Before after")], 8, slice([paragraph(" pasted ")], 1, 1)),
		).toStrictEqual({ type: "doc", content: [paragraph("Before  pasted after")] });
	});

	it("pastes several paragraphs into the middle of one", () => {
		expect(
			paste(
				[paragraph("Before after")],
				8,
				slice([paragraph("one"), paragraph(), paragraph("two ")], 1, 1),
			),
		).toStrictEqual({
			type: "doc",
			content: [paragraph("Before one"), paragraph("two after")],
		});
	});

	it("pastes as it came where cleaning would leave a container its schema refuses", () => {
		const pasted = slice([{ type: "calloutBlock", content: [paragraph()] }], 0, 0);

		expect(normalizePastedSlice(pasted, schema)).toBe(pasted);
	});
});
