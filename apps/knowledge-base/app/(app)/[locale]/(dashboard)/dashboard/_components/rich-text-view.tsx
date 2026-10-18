"use client";

import { RichTextEditor } from "@dariah-eric/ui/rich-text-editor";
import type { JSONContent } from "@tiptap/core";
import type { ReactNode } from "react";

interface RichTextViewProps {
	content: JSONContent;
	/** Scales the text of the content element. */
	size?: "sm" | "md" | "lg";
}

export function RichTextView(props: Readonly<RichTextViewProps>): ReactNode {
	const { content, size } = props;

	return <RichTextEditor content={content} isEditable={false} size={size} />;
}
