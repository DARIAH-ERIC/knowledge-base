import type { JSONContent } from "@tiptap/core";

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
