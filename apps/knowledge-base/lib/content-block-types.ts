import type { ImageCaptionMode } from "@dariah-eric/database/image-captions";
import type { JSONContent } from "@tiptap/core";
import type { Key } from "react-aria-components";

import type { SelectedImage } from "@/lib/selected-image";

/**
 * The shape of a stored content block as both sides of the app hold it: the dashboard's editor,
 * which writes it, and the renderers, which read it. Kept apart from either so the public site's
 * renderer does not have to reach into the dashboard's component tree for its types.
 *
 * The editor's own `unified_content` pseudo-block is not here — it exists only while editing, and
 * is split back into these before anything is saved.
 */
export interface RichTextContentBlockItem {
	id: Key;
	type: "rich_text";
	position?: number;
	content?: JSONContent;
}

export interface ImageContentBlockItem {
	id: Key;
	type: "image";
	position?: number;
	content?: {
		imageKey?: string;
		imageUrl?: string;
		alt?: string | null;
		assetCaption?: JSONContent | null;
		caption?: JSONContent | null;
		captionMode?: ImageCaptionMode;
		layout?: "default" | "wide" | "full" | "float-start" | "float-end";
	};
}

export interface EmbedContentBlockItem {
	id: Key;
	type: "embed";
	position?: number;
	content?: { url?: string; title?: string; caption?: JSONContent | null };
}

export interface DataContentBlockItem {
	id: Key;
	type: "data";
	position?: number;
	content?: {
		dataType?:
			| "events"
			| "news"
			| "opportunities"
			| "funding_calls"
			| "pages"
			| "spotlight_articles"
			| "impact_case_studies";
		limit?: number;
		selectedIds?: Array<string>;
	};
}

export interface CalloutContentBlockItem {
	id: Key;
	type: "callout";
	position?: number;
	content?: {
		intent?: "neutral" | "info" | "warning" | "danger" | "success";
		title?: string;
		content?: JSONContent;
	};
}

export interface HeroContentBlockItem {
	id: Key;
	type: "hero";
	position?: number;
	content?: {
		title?: string;
		subtitle?: string;
		eyebrow?: string;
		imageKey?: string;
		imageUrl?: string;
		/** The picked asset, for the editor's image card. Only `imageKey` is persisted. */
		asset?: SelectedImage;
		caption?: JSONContent | null;
		captionMode?: ImageCaptionMode;
		ctas?: Array<{ label: string; url: string }>;
	};
}

export interface GalleryContentBlockItem {
	id: Key;
	type: "gallery";
	position?: number;
	content?: {
		layout?: "carousel" | "grid";
		items?: Array<{
			imageKey?: string;
			imageUrl?: string;
			/** The picked asset, for the editor's image card. Only `imageKey` is persisted. */
			asset?: SelectedImage;
			caption?: JSONContent | null;
			captionMode?: ImageCaptionMode;
		}>;
	};
}

export interface AccordionContentBlockItem {
	id: Key;
	type: "accordion";
	position?: number;
	content?: {
		items?: Array<{ title: string; content?: JSONContent }>;
	};
}

export interface MediaTextContentBlockItem {
	id: Key;
	type: "media_text";
	position?: number;
	content?: {
		imageKey?: string;
		imageUrl?: string;
		alt?: string | null;
		assetCaption?: JSONContent | null;
		caption?: JSONContent | null;
		captionMode?: ImageCaptionMode;
		side?: "start" | "end";
		content?: JSONContent;
	};
}

export type ContentBlock =
	| RichTextContentBlockItem
	| ImageContentBlockItem
	| EmbedContentBlockItem
	| CalloutContentBlockItem
	| DataContentBlockItem
	| GalleryContentBlockItem
	| HeroContentBlockItem
	| AccordionContentBlockItem
	| MediaTextContentBlockItem;
