import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { withTrimmedBlankEdges } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks-view";

function paragraph(text: string): JSONContent {
	return { type: "paragraph", content: [{ type: "text", text }] };
}

const heading: JSONContent = {
	type: "heading",
	attrs: { level: 3 },
	content: [{ type: "text", text: "About the speakers" }],
};

/** Exactly what the WordPress import left behind: a bare, contentless spacer paragraph. */
const spacer: JSONContent = { type: "paragraph" };

function doc(...content: Array<JSONContent>): JSONContent {
	return { type: "doc", content };
}

describe("withTrimmedBlankEdges", () => {
	/**
	 * The bug this pins down: a block ending on "About the speakers" carried a trailing spacer
	 * paragraph, which rendered as an empty line box plus its own collapsed top margin — more space
	 * than the block gap itself — between the heading and the speaker bio below it.
	 */
	it("drops a spacer paragraph left after a trailing heading", () => {
		expect(withTrimmedBlankEdges(doc(paragraph("intro"), heading, spacer))).toStrictEqual(
			doc(paragraph("intro"), heading),
		);
	});

	it("drops blank paragraphs at both edges", () => {
		expect(withTrimmedBlankEdges(doc(spacer, paragraph("kept"), spacer))).toStrictEqual(
			doc(paragraph("kept")),
		);
	});

	it("keeps blank paragraphs between visible content", () => {
		const document = doc(paragraph("a"), spacer, paragraph("b"));
		expect(withTrimmedBlankEdges(document)).toStrictEqual(document);
	});

	it("treats a whitespace-only paragraph as blank", () => {
		expect(withTrimmedBlankEdges(doc(paragraph("   ")))).toStrictEqual(doc());
	});

	it("leaves a document without a content array alone", () => {
		expect(withTrimmedBlankEdges({ type: "doc" })).toStrictEqual({ type: "doc" });
	});
});
