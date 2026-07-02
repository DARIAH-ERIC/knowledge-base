import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { cleanTiptapDoc, findOverExtendedLinks } from "./clean-tiptap-content";

function doc(...content: Array<JSONContent>): JSONContent {
	return { type: "doc", content };
}

describe("cleanTiptapDoc", () => {
	it("strips a bold mark from heading text (presentational concern of the frontend)", () => {
		const input = doc({
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", marks: [{ type: "bold" }], text: "Contact" }],
		});
		expect(cleanTiptapDoc(input)).toStrictEqual(
			doc({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Contact" }] }),
		);
	});

	it("keeps non-bold marks (link, italic) inside headings", () => {
		const input = doc({
			type: "heading",
			attrs: { level: 2 },
			content: [
				{ type: "text", marks: [{ type: "link", attrs: { href: "https://x" } }], text: "Read" },
			],
		});
		expect(cleanTiptapDoc(input)).toStrictEqual(input);
	});

	it("turns a leading <br> in a heading into nothing (merge-to-space then trim)", () => {
		const input = doc({
			type: "heading",
			attrs: { level: 3 },
			content: [
				{ type: "hardBreak" },
				{ type: "text", marks: [{ type: "bold" }], text: "Contact" },
			],
		});
		expect(cleanTiptapDoc(input)).toStrictEqual(
			doc({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Contact" }] }),
		);
	});

	it("merges a mid-heading <br> into a single space", () => {
		const input = doc({
			type: "heading",
			attrs: { level: 2 },
			content: [
				{ type: "text", text: "Line one" },
				{ type: "hardBreak" },
				{ type: "text", text: "Line two" },
			],
		});
		expect(cleanTiptapDoc(input)).toStrictEqual(
			doc({
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: "Line one Line two" }],
			}),
		);
	});

	it("converts non-breaking spaces to regular spaces", () => {
		const input = doc({
			type: "paragraph",
			content: [{ type: "text", text: `video\u{00A0}and\u{00A0}audio` }],
		});
		expect(cleanTiptapDoc(input)).toStrictEqual(
			doc({ type: "paragraph", content: [{ type: "text", text: "video and audio" }] }),
		);
	});

	it("removes imported HTML presentation and browser attributes from link marks", () => {
		const input = doc({
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [
						{
							type: "link",
							attrs: {
								href: "https://shewrote.rich.ru.nl/",
								target: "_blank",
								rel: "noopener noreferrer nofollow",
								class: "cursor-pointer OWAAutoLink elementToProof",
							},
						},
					],
					text: "SHEWROTE",
				},
			],
		});

		expect(cleanTiptapDoc(input)).toStrictEqual(
			doc({
				type: "paragraph",
				content: [
					{
						type: "text",
						marks: [
							{
								type: "link",
								attrs: {
									href: "https://shewrote.rich.ru.nl/",
								},
							},
						],
						text: "SHEWROTE",
					},
				],
			}),
		);
	});

	it("removes imported CSS classes from nodes while preserving other attributes", () => {
		const input = doc({
			type: "image",
			attrs: { src: "https://x/image.png", alt: "Example", class: "aligncenter wp-image-12" },
		});

		expect(cleanTiptapDoc(input)).toStrictEqual(
			doc({ type: "image", attrs: { src: "https://x/image.png", alt: "Example" } }),
		);
	});

	it("removes empty spacer paragraphs (with and without a content key)", () => {
		const input = doc(
			{ type: "paragraph" },
			{ type: "paragraph", content: [{ type: "text", text: "Kept" }] },
			{ type: "paragraph", content: [{ type: "text", text: "  " }] },
		);
		expect(cleanTiptapDoc(input)).toStrictEqual(
			doc({ type: "paragraph", content: [{ type: "text", text: "Kept" }] }),
		);
	});

	it("drops leading/trailing <br> in a paragraph but keeps a single intentional line break", () => {
		const input = doc({
			type: "paragraph",
			content: [
				{ type: "hardBreak" },
				{ type: "text", text: "one" },
				{ type: "hardBreak" },
				{ type: "text", text: "two" },
				{ type: "hardBreak" },
			],
		});
		expect(cleanTiptapDoc(input)).toStrictEqual(
			doc({
				type: "paragraph",
				content: [
					{ type: "text", text: "one" },
					{ type: "hardBreak" },
					{ type: "text", text: "two" },
				],
			}),
		);
	});

	it("collapses consecutive <br> to a single line break", () => {
		const input = doc({
			type: "paragraph",
			content: [
				{ type: "text", text: "a" },
				{ type: "hardBreak" },
				{ type: "hardBreak" },
				{ type: "text", text: "b" },
			],
		});
		expect(cleanTiptapDoc(input)).toStrictEqual(
			doc({
				type: "paragraph",
				content: [{ type: "text", text: "a" }, { type: "hardBreak" }, { type: "text", text: "b" }],
			}),
		);
	});

	it("preserves a real space between differently-marked inline runs", () => {
		const input = doc({
			type: "paragraph",
			content: [
				{ type: "text", text: "External links" },
				{ type: "text", text: " " },
				{ type: "text", marks: [{ type: "link", attrs: { href: "https://x" } }], text: "here" },
			],
		});
		expect(cleanTiptapDoc(input)).toStrictEqual(
			doc({
				type: "paragraph",
				content: [
					{ type: "text", text: "External links " },
					{ type: "text", marks: [{ type: "link", attrs: { href: "https://x" } }], text: "here" },
				],
			}),
		);
	});

	it("drops empty list items and the list once it is empty", () => {
		const input = doc({
			type: "bulletList",
			content: [
				{ type: "listItem", content: [{ type: "paragraph" }] },
				{
					type: "listItem",
					content: [{ type: "paragraph", content: [{ type: "text", text: " " }] }],
				},
			],
		});
		expect(cleanTiptapDoc(input)).toStrictEqual(doc());
	});

	it("keeps non-empty list items", () => {
		const input = doc({
			type: "bulletList",
			content: [
				{
					type: "listItem",
					content: [{ type: "paragraph", content: [{ type: "text", text: "Item" }] }],
				},
				{ type: "listItem", content: [{ type: "paragraph" }] },
			],
		});
		expect(cleanTiptapDoc(input)).toStrictEqual(
			doc({
				type: "bulletList",
				content: [
					{
						type: "listItem",
						content: [{ type: "paragraph", content: [{ type: "text", text: "Item" }] }],
					},
				],
			}),
		);
	});

	it("leaves atoms like images and horizontal rules untouched", () => {
		const input = doc(
			{ type: "image", attrs: { src: "https://x/a.png", alt: "A" } },
			{ type: "horizontalRule" },
		);
		expect(cleanTiptapDoc(input)).toStrictEqual(input);
	});

	it("is idempotent", () => {
		const input = doc(
			{ type: "paragraph" },
			{
				type: "heading",
				attrs: { level: 3 },
				content: [{ type: "hardBreak" }, { type: "text", marks: [{ type: "bold" }], text: "T " }],
			},
			{
				type: "paragraph",
				content: [
					{ type: "hardBreak" },
					{ type: "text", text: "body text" },
					{ type: "hardBreak" },
				],
			},
		);
		const once = cleanTiptapDoc(input);
		expect(cleanTiptapDoc(once)).toStrictEqual(once);
	});

	it("returns a document without oddities unchanged", () => {
		const input = doc(
			{ type: "paragraph", content: [{ type: "text", text: "Clean paragraph." }] },
			{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Clean heading" }] },
		);
		expect(cleanTiptapDoc(input)).toStrictEqual(input);
	});
});

describe("findOverExtendedLinks", () => {
	it("flags a link whose text has swallowed following prose", () => {
		const input = doc({
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "link", attrs: { href: "https://x.org/" } }],
					text: "https://x.org/). The next sentence starts here",
				},
			],
		});
		const issues = findOverExtendedLinks(input);
		expect(issues).toHaveLength(1);
		expect(issues[0]?.href).toBe("https://x.org/");
	});

	it("does not flag a well-formed link", () => {
		const input = doc({
			type: "paragraph",
			content: [
				{ type: "text", marks: [{ type: "link", attrs: { href: "https://x" } }], text: "here" },
			],
		});
		expect(findOverExtendedLinks(input)).toHaveLength(0);
	});
});
