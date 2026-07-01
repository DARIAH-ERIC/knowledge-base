import { isEmptyRichTextDocument } from "@dariah-eric/ui/rich-text";
import type { JSONContent } from "@tiptap/core";
import * as v from "valibot";

/**
 * Parses a richtext caption submitted as a JSON string (from a form's hidden input) into Tiptap
 * JSON. Missing, unparseable, or empty documents collapse to `null` so we never persist an
 * empty-paragraph placeholder.
 */
export const RichTextCaptionFormSchema = v.pipe(
	v.optional(v.string()),
	v.transform((value): JSONContent | null => {
		if (value == null || value.trim() === "") {
			return null;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(value);
		} catch {
			return null;
		}

		const content = parsed as JSONContent;

		return isEmptyRichTextDocument(content) ? null : content;
	}),
);
