import { type JSONContent, getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { collectFootnotes, numberFootnotes } from "@/lib/rich-text";
import { createRichTextExtensions } from "@/lib/rich-text-editor";

function note(text: string): JSONContent {
	return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

function footnote(text: string): JSONContent {
	return { type: "footnote", attrs: { content: note(text) } };
}

function paragraph(...content: Array<JSONContent>): JSONContent {
	return { type: "paragraph", content };
}

/** The `number` of every marker below `input`, in the order the walk found them. */
function numbersIn(input: unknown): Array<unknown> {
	const found: Array<unknown> = [];

	function visit(node: unknown): void {
		if (Array.isArray(node)) {
			node.forEach((item) => {
				visit(item);
			});
			return;
		}
		if (node == null || typeof node !== "object") {
			return;
		}
		const record = node as Record<string, unknown>;
		if (record.type === "footnote") {
			found.push((record.attrs as Record<string, unknown> | undefined)?.number);
			return;
		}
		Object.values(record).forEach((value) => {
			visit(value);
		});
	}

	visit(input);
	return found;
}

describe("numberFootnotes", () => {
	it("numbers markers from one, in reading order", () => {
		const numbered = numberFootnotes({
			type: "doc",
			content: [paragraph(footnote("first")), paragraph(footnote("second"))],
		});

		expect(numbersIn(numbered)).toStrictEqual([1, 2]);
	});

	it("counts across the content blocks of a whole article", () => {
		// Blocks are a storage split of one document, so a marker in a later block continues the count
		// — which is what keeps the number in step with the note list a reader sees.
		const numbered = numberFootnotes([
			{ type: "rich_text", content: { type: "doc", content: [paragraph(footnote("first"))] } },
			{ type: "image", content: { imageUrl: "/example.jpg", caption: null } },
			{ type: "rich_text", content: { type: "doc", content: [paragraph(footnote("second"))] } },
		]);

		expect(numbersIn(numbered)).toStrictEqual([1, 2]);
	});

	it("indexes the note list collectFootnotes returns", () => {
		const blocks = [
			{ type: "rich_text", content: { type: "doc", content: [paragraph(footnote("first"))] } },
			{ type: "rich_text", content: { type: "doc", content: [paragraph(footnote("second"))] } },
		];

		const numbered = numberFootnotes(blocks);
		const notes = collectFootnotes(numbered);

		expect(numbersIn(numbered)).toStrictEqual([1, 2]);
		expect(notes[0]).toStrictEqual(note("first"));
		expect(notes[1]).toStrictEqual(note("second"));
	});

	it("reaches markers nested in table cells and media bodies", () => {
		const numbered = numberFootnotes({
			type: "doc",
			content: [
				{
					type: "mediaTextBlock",
					attrs: { imageKey: "logo", side: "start" },
					content: [paragraph(footnote("in a media body"))],
				},
				{
					type: "table",
					content: [
						{
							type: "tableRow",
							content: [{ type: "tableCell", content: [paragraph(footnote("in a cell"))] }],
						},
					],
				},
			],
		});

		expect(numbersIn(numbered)).toStrictEqual([1, 2]);
	});

	it("numbers a marker whose note was never written", () => {
		const numbered = numberFootnotes({
			type: "doc",
			content: [paragraph({ type: "footnote", attrs: { content: null } }, footnote("second"))],
		});

		expect(numbersIn(numbered)).toStrictEqual([1, 2]);
	});

	it("keeps the note itself intact", () => {
		const numbered = numberFootnotes({ type: "doc", content: [paragraph(footnote("a note"))] }) as {
			content: Array<JSONContent>;
		};

		expect(numbered.content[0]!.content![0]!.attrs!.content).toStrictEqual(note("a note"));
	});

	it("leaves a document without footnotes structurally equal", () => {
		const doc = { type: "doc", content: [paragraph({ type: "text", text: "Plain." })] };

		expect(numberFootnotes(doc)).toStrictEqual(doc);
	});

	it("does not mutate its input", () => {
		const doc = { type: "doc", content: [paragraph(footnote("a note"))] };
		const before = JSON.stringify(doc);

		numberFootnotes(doc);

		expect(JSON.stringify(doc)).toBe(before);
	});
});

describe("the footnote node's `number` attribute", () => {
	const schema = getSchema(createRichTextExtensions());

	it("survives the schema, so a renderer still sees it", () => {
		// Renderers parse the json through the schema first, which drops any attribute the node does
		// not declare — annotating an undeclared one would silently render unnumbered markers.
		const numbered = numberFootnotes({ type: "doc", content: [paragraph(footnote("a note"))] });

		expect(numbersIn(schema.nodeFromJSON(numbered).toJSON())).toStrictEqual([1]);
	});

	it("is not serialised to html, so a rendered document cannot carry it back in", () => {
		const node = schema.nodes.footnote!.create({ content: note("a note"), number: 3 });
		const [tag, attrs] = schema.nodes.footnote!.spec.toDOM!(node) as [
			string,
			Record<string, unknown>,
		];

		expect(tag).toBe("sup");
		expect(attrs).not.toHaveProperty("number");
	});

	it("defaults to nothing, so the editor's own markers stay counter-numbered", () => {
		expect(schema.nodes.footnote!.create({ content: note("a note") }).attrs.number).toBeNull();
	});
});
