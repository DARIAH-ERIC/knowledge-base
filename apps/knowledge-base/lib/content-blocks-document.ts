import type { ImageCaptionMode } from "@dariah-eric/database/image-captions";
import type { JSONContent } from "@tiptap/core";

import type { ContentBlockInput } from "@/lib/content-block-input";

interface RichTextBlock {
	type: "rich_text";
	content?: JSONContent;
}

interface ImageBlock {
	type: "image";
	content?: {
		imageKey?: string;
		imageUrl?: string;
		alt?: string | null;
		assetCaption?: JSONContent | null;
		caption?: JSONContent | null;
		captionMode?: ImageCaptionMode;
	};
}

interface EmbedBlock {
	type: "embed";
	content?: { url?: string; title?: string; caption?: JSONContent | null };
}

interface CalloutBlock {
	type: "callout";
	content?: {
		intent?: "default" | "info" | "warning" | "danger" | "success";
		title?: string;
		content?: JSONContent;
	};
}

export type MergeableBlock = RichTextBlock | ImageBlock | EmbedBlock | CalloutBlock;

/**
 * Merges an ordered sequence of inline content blocks into a single Tiptap document. Typed blocks
 * become custom top-level nodes; rich_text blocks contribute their child nodes directly. The result
 * is used as the initial content of the unified editor.
 */
export function mergeBlocksToDocument(blocks: Array<MergeableBlock>): JSONContent {
	const nodes: Array<JSONContent> = [];

	for (const block of blocks) {
		if (block.type === "rich_text") {
			const children = block.content?.content ?? [];
			nodes.push(...children);
		} else if (block.type === "image") {
			const captionMode =
				block.content?.captionMode ?? (block.content?.caption != null ? "override" : "inherit");
			nodes.push({
				type: "assetImage",
				attrs: {
					imageKey: block.content?.imageKey ?? null,
					imageUrl: block.content?.imageUrl ?? null,
					alt: block.content?.alt ?? null,
					assetCaption: block.content?.assetCaption ?? null,
					caption: block.content?.caption ?? null,
					captionMode,
				},
			});
		} else if (block.type === "embed") {
			nodes.push({
				type: "embedBlock",
				attrs: {
					url: block.content?.url ?? null,
					title: block.content?.title ?? null,
					caption: block.content?.caption ?? null,
				},
			});
		} else {
			nodes.push({
				type: "calloutBlock",
				attrs: {
					intent: block.content?.intent ?? "info",
					title: block.content?.title ?? null,
					content: block.content?.content ?? null,
				},
			});
		}
	}

	if (nodes.length === 0) {
		nodes.push({ type: "paragraph" });
	}

	return { type: "doc", content: nodes };
}

/**
 * Splits a unified Tiptap document back into an ordered array of ContentBlockInputs. Custom
 * top-level nodes become their corresponding typed blocks; runs of other nodes become rich_text
 * blocks. All produced blocks are treated as new (no `id` / `position`) so the server will delete
 * the old blocks and re-insert.
 */
export function splitDocumentToBlocks(doc: JSONContent): Array<ContentBlockInput> {
	const nodes = doc.content ?? [];
	const blocks: Array<ContentBlockInput> = [];
	let richTextRun: Array<JSONContent> = [];

	function flushRichText() {
		if (richTextRun.length === 0) {
			return;
		}
		blocks.push({
			id: crypto.randomUUID(),
			type: "rich_text",
			content: { type: "doc", content: richTextRun },
		});
		richTextRun = [];
	}

	for (const node of nodes) {
		if (node.type === "assetImage") {
			flushRichText();
			blocks.push({
				id: crypto.randomUUID(),
				type: "image",
				content: {
					imageKey: (node.attrs?.imageKey as string | null | undefined) ?? undefined,
					imageUrl: (node.attrs?.imageUrl as string | null | undefined) ?? undefined,
					alt: (node.attrs?.alt as string | null | undefined) ?? undefined,
					assetCaption: (node.attrs?.assetCaption as JSONContent | null | undefined) ?? undefined,
					caption: (node.attrs?.caption as JSONContent | null | undefined) ?? undefined,
					captionMode:
						(node.attrs?.captionMode as ImageCaptionMode | null | undefined) ?? "inherit",
				},
			});
		} else if (node.type === "embedBlock") {
			flushRichText();
			blocks.push({
				id: crypto.randomUUID(),
				type: "embed",
				content: {
					url: (node.attrs?.url as string | null | undefined) ?? undefined,
					title: (node.attrs?.title as string | null | undefined) ?? undefined,
					caption: (node.attrs?.caption as JSONContent | null | undefined) ?? undefined,
				},
			});
		} else if (node.type === "calloutBlock") {
			flushRichText();
			blocks.push({
				id: crypto.randomUUID(),
				type: "callout",
				content: {
					intent:
						(node.attrs?.intent as
							| "default"
							| "info"
							| "warning"
							| "danger"
							| "success"
							| undefined) ?? "info",
					title: (node.attrs?.title as string | null | undefined) ?? undefined,
					content: (node.attrs?.content as JSONContent | null | undefined) ?? undefined,
				},
			});
		} else {
			richTextRun.push(node);
		}
	}

	flushRichText();

	return blocks;
}
