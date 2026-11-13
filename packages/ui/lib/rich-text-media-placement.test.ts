import { type Editor, type JSONContent, getSchema } from "@tiptap/core";
import { Fragment, type Node as ProseMirrorNode, Slice } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { dropPoint } from "@tiptap/pm/transform";
import { describe, expect, it } from "vitest";

import { createRichTextExtensions } from "@/lib/rich-text-editor";
import { isNestedImageAt, placePastedMedia } from "@/lib/rich-text-media-placement";
import { canInsertBlock } from "@/lib/rich-text-slash-menu";

const schema = getSchema(createRichTextExtensions());

const mediaNodes: Record<string, JSONContent> = {
	assetImage: { type: "assetImage", attrs: { imageKey: "images/a.jpg" } },
	embedBlock: { type: "embedBlock", attrs: { url: "https://example.com/video" } },
	galleryBlock: { type: "galleryBlock", attrs: { items: [] } },
	mediaTextBlock: {
		type: "mediaTextBlock",
		attrs: { imageKey: "images/b.jpg" },
		content: [{ type: "paragraph" }],
	},
};

function paragraph(text: string): JSONContent {
	return { type: "paragraph", content: text !== "" ? [{ type: "text", text }] : [] };
}

function list(...items: Array<Array<JSONContent>>): JSONContent {
	return {
		type: "bulletList",
		content: items.map((content) => {
			return { type: "listItem", content };
		}),
	};
}

function table(...cells: Array<Array<JSONContent>>): JSONContent {
	return {
		type: "table",
		content: [
			{
				type: "tableRow",
				content: cells.map((content) => {
					return { type: "tableCell", content };
				}),
			},
		],
	};
}

function doc(...content: Array<JSONContent>): JSONContent {
	return { type: "doc", content };
}

function isValid(json: JSONContent): boolean {
	try {
		schema.nodeFromJSON(json).check();
		return true;
	} catch {
		return false;
	}
}

/** The node tree as nested type names (text as its string), so placements read at a glance. */
function outline(node: ProseMirrorNode): unknown {
	if (node.isText) {
		return node.text;
	}
	const children: Array<unknown> = [];
	node.forEach((child) => {
		children.push(outline(child));
	});
	return children.length > 0 ? { [node.type.name]: children } : node.type.name;
}

/**
 * An editor state with the cursor inside the first text that contains `marker`: before it, or with
 * `after`, right after it.
 */
function stateAt(json: JSONContent, marker: string, after = false): EditorState {
	const node = schema.nodeFromJSON(json);
	const positions: Array<number> = [];
	node.descendants((child, offset) => {
		if (child.isText && child.text!.includes(marker)) {
			positions.push(offset + child.text!.indexOf(marker) + (after ? marker.length : 0));
		}
	});
	const [position] = positions;
	if (position == null) {
		throw new Error(`No text contains "${marker}".`);
	}
	return EditorState.create({ doc: node, selection: TextSelection.create(node, position) });
}

function canInsertAt(json: JSONContent, marker: string, type: string): boolean {
	return canInsertBlock({ schema, state: stateAt(json, marker) } as unknown as Editor, type);
}

function pasteAt(json: JSONContent, marker: string, nodes: Array<JSONContent>) {
	const state = stateAt(json, marker);
	const slice = new Slice(Fragment.fromArray(nodes.map((node) => schema.nodeFromJSON(node))), 0, 0);
	return placePastedMedia(state, slice);
}

/**
 * Inserts `node` at the cursor the way tiptap's `insertContentAt` does for block content: an empty
 * paragraph is replaced, a cursor at the start of a non-empty one inserts before it, and otherwise
 * ProseMirror fits the node in by closing as few ancestors as it can.
 */
function insertAt(json: JSONContent, marker: string, node: JSONContent): ProseMirrorNode {
	const state = stateAt(json, marker, true);
	const tr = state.tr;
	let { from, to } = state.selection;
	const { parent, parentOffset } = state.selection.$from;
	if (parent.isTextblock && parent.childCount === 0) {
		from -= 1;
		to += 1;
	} else if (parentOffset === 0 && parent.content.size > 0) {
		from = Math.max(0, from - 1);
	}
	tr.replaceWith(from, to, schema.nodeFromJSON(node));
	tr.doc.check();
	return tr.doc;
}

describe("the schema", () => {
	it("accepts an image in a list item, after its paragraph, and in a plain blockquote", () => {
		expect(isValid(doc(list([paragraph("Item."), mediaNodes.assetImage!])))).toBeTruthy();
		expect(isValid(doc({ type: "blockquote", content: [mediaNodes.assetImage!] }))).toBeTruthy();
	});

	it("still opens a list item with a paragraph", () => {
		expect(isValid(doc(list([mediaNodes.assetImage!])))).toBeFalsy();
	});

	const nestedPlacements: Record<string, (media: JSONContent) => JSONContent> = {
		"a list item": (media) => doc(list([paragraph("Item."), media])),
		"a blockquote": (media) => doc({ type: "blockquote", content: [media] }),
	};

	for (const [nodeType, media] of Object.entries(mediaNodes)) {
		if (nodeType === "assetImage") {
			continue;
		}
		for (const [where, build] of Object.entries(nestedPlacements)) {
			it(`refuses a ${nodeType} inside ${where}`, () => {
				expect(isValid(build(media))).toBeFalsy();
			});
		}
	}

	const placements: Record<string, (media: JSONContent) => JSONContent> = {
		"a table cell": (media) => doc(table([media])),
		"a quote with a byline": (media) =>
			doc({ type: "quoteBlock", attrs: { authors: [] }, content: [media] }),
		"a media-text body": (media) =>
			doc({ ...mediaNodes.mediaTextBlock, content: [paragraph("Bio."), media] }),
	};

	for (const [nodeType, media] of Object.entries(mediaNodes)) {
		for (const [where, build] of Object.entries(placements)) {
			it(`refuses a ${nodeType} inside ${where}`, () => {
				expect(isValid(build(media))).toBeFalsy();
			});
		}

		it(`accepts a ${nodeType} at the top level and in callout and accordion bodies`, () => {
			expect(isValid(doc(paragraph("Text."), media))).toBeTruthy();
			expect(
				isValid(doc({ type: "calloutBlock", attrs: { intent: "info" }, content: [media] })),
			).toBeTruthy();
			expect(
				isValid(
					doc({
						type: "accordionBlock",
						content: [{ type: "accordionItem", attrs: { title: "" }, content: [media] }],
					}),
				),
			).toBeTruthy();
		});
	}
});

describe("inserting media", () => {
	it("puts an image inserted at the end of a list item's text into that item", () => {
		const result = insertAt(
			doc(list([paragraph("First.")], [paragraph("Second.")])),
			"First.",
			mediaNodes.assetImage!,
		);

		expect(outline(result)).toStrictEqual({
			doc: [
				{
					bulletList: [
						{ listItem: [{ paragraph: ["First."] }, "assetImage"] },
						{ listItem: [{ paragraph: ["Second."] }] },
					],
				},
			],
		});
	});

	it("is offered in a list or blockquote", () => {
		expect(canInsertAt(doc(list([paragraph("Item.")])), "Item", "assetImage")).toBeTruthy();
		expect(
			canInsertAt(doc({ type: "blockquote", content: [paragraph("Said.")] }), "Said", "assetImage"),
		).toBeTruthy();
	});

	it("is offered in a callout body, which holds it", () => {
		expect(
			canInsertAt(
				doc({
					type: "calloutBlock",
					attrs: { intent: "info" },
					content: [list([paragraph("Item.")])],
				}),
				"Item",
				"galleryBlock",
			),
		).toBeTruthy();
	});

	it("is not offered where it would split a table, a media-text block or a byline quote", () => {
		for (const type of Object.keys(mediaNodes)) {
			expect(canInsertAt(doc(table([paragraph("Cell.")])), "Cell", type)).toBeFalsy();
			expect(
				canInsertAt(
					doc({ ...mediaNodes.mediaTextBlock, content: [paragraph("Bio.")] }),
					"Bio",
					type,
				),
			).toBeFalsy();
			expect(
				canInsertAt(
					doc({ type: "quoteBlock", attrs: { authors: [] }, content: [paragraph("Said.")] }),
					"Said",
					type,
				),
			).toBeFalsy();
		}
	});
});

describe("pasting media", () => {
	it("leaves a paste into a list to ProseMirror, which keeps the image in the list item", () => {
		expect(pasteAt(doc(list([paragraph("Item.")])), "Item", [mediaNodes.assetImage!])).toBeNull();
	});

	it("moves an image pasted into a table cell to just after the table", () => {
		const tr = pasteAt(
			doc(
				paragraph("Before."),
				table([paragraph("Cell.")], [paragraph("Other.")]),
				paragraph("After."),
			),
			"Cell",
			[mediaNodes.assetImage!],
		);

		expect(tr).not.toBeNull();
		tr!.doc.check();
		expect(outline(tr!.doc)).toStrictEqual({
			doc: [
				{ paragraph: ["Before."] },
				{
					table: [
						{
							tableRow: [
								{ tableCell: [{ paragraph: ["Cell."] }] },
								{ tableCell: [{ paragraph: ["Other."] }] },
							],
						},
					],
				},
				"assetImage",
				{ paragraph: ["After."] },
			],
		});
		expect(tr!.selection.$from.nodeAfter?.type.name).toBe("assetImage");
	});

	it("keeps pasted text in the cell and moves only the media out, in order", () => {
		const tr = pasteAt(doc(table([paragraph("Cell.")])), "Cell", [
			mediaNodes.assetImage!,
			paragraph("Pasted."),
			mediaNodes.embedBlock!,
		]);

		expect(tr).not.toBeNull();
		tr!.doc.check();
		const [tableNode, ...after] = (outline(tr!.doc) as { doc: Array<unknown> }).doc;
		expect(JSON.stringify(tableNode)).toContain("Pasted.");
		expect(JSON.stringify(tableNode)).not.toContain("assetImage");
		expect(after).toStrictEqual(["assetImage", "embedBlock"]);
	});

	it("moves media pasted into a media-text body or a byline quote out, without duplicating it", () => {
		const mediaText = pasteAt(
			doc({ ...mediaNodes.mediaTextBlock, content: [paragraph("Bio.")] }),
			"Bio",
			[mediaNodes.galleryBlock!],
		);
		const quote = pasteAt(
			doc({ type: "quoteBlock", attrs: { authors: [] }, content: [paragraph("Said.")] }),
			"Said",
			[mediaNodes.assetImage!],
		);

		mediaText!.doc.check();
		quote!.doc.check();
		expect(outline(mediaText!.doc)).toStrictEqual({
			doc: [{ mediaTextBlock: [{ paragraph: ["Bio."] }] }, "galleryBlock"],
		});
		expect(outline(quote!.doc)).toStrictEqual({
			doc: [{ quoteBlock: [{ paragraph: ["Said."] }] }, "assetImage"],
		});
	});

	it("leaves a paste without media alone", () => {
		expect(pasteAt(doc(table([paragraph("Cell.")])), "Cell", [paragraph("Text.")])).toBeNull();
	});
});

describe("dropping media", () => {
	it("lands beside a table, never inside it", () => {
		const state = stateAt(doc(paragraph("Before."), table([paragraph("Cell.")])), "Cell");
		const slice = new Slice(Fragment.from(schema.nodeFromJSON(mediaNodes.assetImage!)), 0, 0);

		const point = dropPoint(state.doc, state.selection.from, slice);

		expect(point).not.toBeNull();
		expect(state.doc.resolve(point!).parent.type.name).toBe("doc");
	});
});

describe("isNestedImageAt", () => {
	function imagePosition(json: JSONContent): { doc: ProseMirrorNode; pos: number } {
		const node = schema.nodeFromJSON(json);
		const positions: Array<number> = [];
		node.descendants((child, pos) => {
			if (child.type.name === "assetImage") {
				positions.push(pos);
			}
		});
		return { doc: node, pos: positions[0]! };
	}

	it("is true for an image in a list item or blockquote, which keeps no layout", () => {
		const listed = imagePosition(doc(list([paragraph("Step."), mediaNodes.assetImage!])));
		const quoted = imagePosition(doc({ type: "blockquote", content: [mediaNodes.assetImage!] }));

		expect(isNestedImageAt(listed.doc, listed.pos)).toBeTruthy();
		expect(isNestedImageAt(quoted.doc, quoted.pos)).toBeTruthy();
	});

	it("is false for an image that becomes an image block", () => {
		const topLevel = imagePosition(doc(paragraph("Text."), mediaNodes.assetImage!));
		const inCallout = imagePosition(
			doc({ type: "calloutBlock", attrs: { intent: "info" }, content: [mediaNodes.assetImage!] }),
		);

		expect(isNestedImageAt(topLevel.doc, topLevel.pos)).toBeFalsy();
		expect(isNestedImageAt(inCallout.doc, inCallout.pos)).toBeFalsy();
	});
});
