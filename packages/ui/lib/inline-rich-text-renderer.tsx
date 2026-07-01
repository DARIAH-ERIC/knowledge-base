import type { JSONContent } from "@tiptap/core";
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface Mark {
	type: string;
	attrs?: Record<string, unknown>;
}

function renderText(node: JSONContent, key: number): ReactNode {
	let element: ReactNode = node.text ?? "";

	for (const mark of (node.marks as Array<Mark> | undefined) ?? []) {
		if (mark.type === "bold") {
			element = <strong>{element}</strong>;
		} else if (mark.type === "italic") {
			element = <em>{element}</em>;
		} else if (mark.type === "link") {
			const href = mark.attrs?.href as string | undefined;
			element = (
				<a href={href} rel="noreferrer" target="_blank">
					{element}
				</a>
			);
		}
	}

	return <span key={key}>{element}</span>;
}

function renderNode(node: JSONContent, key: number): ReactNode {
	if (node.type === "text") {
		return renderText(node, key);
	}

	const children = (node.content ?? []).map((child, index) => renderNode(child, index));

	if (node.type === "paragraph") {
		return <p key={key}>{children}</p>;
	}

	// `doc` and any unexpected wrapper node: render children transparently.
	return <span key={key}>{children}</span>;
}

interface InlineRichTextRendererProps {
	content: JSONContent;
	className?: string;
}

/**
 * Read-only, server-compatible renderer for inline caption richtext. Walks the constrained `{ doc >
 * paragraph > text }` shape produced by {@link InlineRichTextEditor} and renders bold, italic and
 * link marks. Kept as a static serializer (rather than a headless editor instance) so captions in
 * lists/tables don't each mount a Tiptap editor.
 */
export function InlineRichTextRenderer(props: Readonly<InlineRichTextRendererProps>): ReactNode {
	const { content, className } = props;

	return (
		<div className={twMerge("richtext richtext-sm", className)}>
			{(content.content ?? []).map((node, index) => renderNode(node, index))}
		</div>
	);
}
