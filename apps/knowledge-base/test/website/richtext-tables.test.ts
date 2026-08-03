import type { JSONContent } from "@tiptap/core";
import { renderToHTMLString } from "@tiptap/static-renderer";
import { describe, expect, it } from "vitest";

import { createRichTextExtensions } from "@dariah-eric/ui/rich-text-editor";

const extensions = createRichTextExtensions();

function cell(type: "tableCell" | "tableHeader", text: string): JSONContent {
	return { type, content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

const tableDocument: JSONContent = {
	type: "doc",
	content: [
		{
			type: "table",
			content: [
				{
					type: "tableRow",
					content: [cell("tableHeader", "Term"), cell("tableHeader", "Meaning")],
				},
				{
					type: "tableRow",
					content: [cell("tableCell", "Post Status"), cell("tableCell", "Open")],
				},
			],
		},
	],
};

/**
 * The static renderer resolves each node through the shared extension set and throws on a node type
 * it does not know, so these assertions are what keeps the read-only views (and the API's stored
 * documents) able to carry the tables the editor and the WordPress backfill now produce.
 */
describe("table rendering", () => {
	it("renders a table document to table markup", () => {
		const html = renderToHTMLString({ content: tableDocument, extensions });

		expect(html).toContain("<table");
		expect(html).toContain("<th");
		expect(html).toContain("<td");
		expect(html).toContain("Post Status");
	});

	it("throws on table nodes when the extension set omits them", () => {
		const withoutTables = extensions.filter((extension) => extension.name !== "tableKit");

		expect(() => {
			renderToHTMLString({ content: tableDocument, extensions: withoutTables });
		}).toThrow();
	});
});
