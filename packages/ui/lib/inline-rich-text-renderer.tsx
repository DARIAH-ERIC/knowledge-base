import type { JSONContent } from "@tiptap/core";
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface Mark {
	type: string;
	attrs?: Record<string, unknown>;
}

function renderText(node: JSONContent, key: number): ReactNode {
	let element: ReactNode = node.text ?? "";

	for (const mark of node.marks ?? []) {
		if (mark.type === "bold") {
			element = <strong>{element}</strong>;
		} else if (mark.type === "italic") {
			element = <em>{element}</em>;
		} else if (mark.type === "link") {
			const href = mark.attrs?.href as string | undefined;
			// No `target`/`rel`: whether a link opens in a new tab is the reader's call, and this
			// renderer also serves in-page anchors, where a new tab is simply wrong. Matches the link
			// mark's own `HTMLAttributes: {}`.
			element = <a href={href}>{element}</a>;
		}
	}

	return <span key={key}>{element}</span>;
}

function renderNode(node: JSONContent, key: number, isInline: boolean): ReactNode {
	if (node.type === "text") {
		return renderText(node, key);
	}

	const children = (node.content ?? []).map((child, index) => renderNode(child, index, isInline));

	if (node.type === "paragraph") {
		return isInline ? <span key={key}>{children}</span> : <p key={key}>{children}</p>;
	}

	// `doc` and any unexpected wrapper node: render children transparently.
	return <span key={key}>{children}</span>;
}

interface InlineRichTextRendererProps {
	content: JSONContent;
	className?: string;
	/**
	 * Renders the text as part of the surrounding line rather than as its own block — for a caller
	 * that puts something after it and wants it on the same line, like the backlink following a
	 * footnote. The editor swallows Enter, so this content is a single paragraph and nothing is lost
	 * by dropping the block boxes.
	 */
	isInline?: boolean;
}

/**
 * Read-only, server-compatible renderer for inline caption richtext. Walks the constrained `{ doc >
 * paragraph > text }` shape produced by {@link InlineRichTextEditor} and renders bold, italic and
 * link marks. Kept as a static serializer (rather than a headless editor instance) so captions in
 * lists/tables don't each mount a Tiptap editor.
 */
export function InlineRichTextRenderer(props: Readonly<InlineRichTextRendererProps>): ReactNode {
	const { content, className, isInline = false } = props;

	const Element = isInline ? "span" : "div";

	return (
		<Element className={twMerge("richtext richtext-sm", className)}>
			{(content.content ?? []).map((node, index) => renderNode(node, index, isInline))}
		</Element>
	);
}
