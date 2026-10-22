import { Heading } from "@tiptap/extension-heading";

/**
 * Headings that cannot be bold. How heavy a heading is belongs to the website's styles; bold on one
 * is formatting carried over from wherever the text was copied, and authors rarely notice it there,
 * because a heading already looks bold in the editor.
 *
 * Leaving `bold` out of the marks a heading allows keeps it out everywhere at once: a pasted
 * heading parses without it, turning a bold paragraph into a heading clears it, and the toolbar's
 * bold has nothing to apply inside one. Every other mark stays allowed — a new mark has to be added
 * here.
 *
 * Stored content must not hold bold headings either: ProseMirror rejects any edit inside a node
 * whose content its schema does not allow. The existing ones were removed by `data:clean:richtext`,
 * which strips them like the paste handling does.
 */
export const HeadingWithoutBold = Heading.extend({
	marks: "link code italic strike",
});
