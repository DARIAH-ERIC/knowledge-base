"use client";

import { RichTextEditor, RichTextEditorToolbarButton } from "@dariah-eric/ui/rich-text-editor";
import type { JSONContent } from "@tiptap/core";
import { ImageIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import type { MediaLibraryAsset } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-asset";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import { mergeBlocksToDocument, splitDocumentToBlocks } from "@/lib/content-blocks-document";

interface RichTextContentBlocksFieldProps {
	"aria-label": string;
	content?: JSONContent;
	initialAssets: Array<MediaLibraryAsset>;
	initialBlocks?: Array<ContentBlock>;
	name: string;
}

export function RichTextContentBlocksField({
	"aria-label": ariaLabel,
	content,
	initialAssets,
	initialBlocks,
	name,
}: Readonly<RichTextContentBlocksFieldProps>): ReactNode {
	const initialContent =
		initialBlocks != null && initialBlocks.length > 0
			? mergeBlocksToDocument(initialBlocks)
			: content;
	const [editorContent, setEditorContent] = useState<JSONContent>(
		initialContent ?? { type: "doc", content: [] },
	);
	const blocks = splitDocumentToBlocks(editorContent);

	return (
		<>
			<RichTextEditor
				aria-label={ariaLabel}
				content={initialContent}
				name={name}
				onChange={setEditorContent}
				renderImagePicker={(insert) => (
					<MediaLibraryDialog
						defaultPrefix="images"
						initialAssets={initialAssets}
						onSelect={(key, url) => {
							insert(key, url);
						}}
						prefixes={["avatars", "images", "logos"]}
						trigger={({ open }) => (
							<RichTextEditorToolbarButton
								aria-label="Insert image"
								icon={ImageIcon}
								onClick={open}
							/>
						)}
					/>
				)}
			/>
			{blocks.map((block, idx) => (
				<input
					key={idx}
					name={`${name}ContentBlocks.${String(idx)}`}
					type="hidden"
					value={JSON.stringify(block)}
				/>
			))}
		</>
	);
}
