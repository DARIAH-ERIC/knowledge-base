import type { JSONContent } from "@tiptap/core";

const STRUCTURAL_NODE_TYPES = new Set([
	"blockquote",
	"bulletList",
	"codeBlock",
	"doc",
	"heading",
	"listItem",
	"orderedList",
	"paragraph",
	"table",
	"tableCell",
	"tableHeader",
	"tableRow",
]);

/**
 * Whether a Tiptap document contains no meaningful content. Empty structural nodes, whitespace-only
 * text, and hard breaks are editor placeholders; leaf nodes such as images remain meaningful.
 */
export function isEmptyRichTextDocument(content: JSONContent | null | undefined): boolean {
	if (content == null) {
		return true;
	}

	function hasMeaningfulContent(node: JSONContent): boolean {
		if (node.type === "text") {
			return (node.text ?? "").trim() !== "";
		}
		if (node.type === "hardBreak") {
			return false;
		}
		if (node.content != null) {
			return node.content.some(hasMeaningfulContent);
		}

		// Unknown leaf nodes and known atoms (for example images and horizontal rules) are content.
		return node.type != null && !STRUCTURAL_NODE_TYPES.has(node.type);
	}

	return !hasMeaningfulContent(content);
}

/**
 * Wrap a plaintext string into a minimal single-paragraph Tiptap document, mirroring the shape the
 * `captions_to_richtext` migration produces. Blank/nullish input becomes `null`.
 */
export function plainTextToRichText(text: string | null | undefined): JSONContent | null {
	if (text == null || text.trim() === "") {
		return null;
	}

	return {
		type: "doc",
		content: [{ type: "paragraph", content: [{ type: "text", text }] }],
	};
}
