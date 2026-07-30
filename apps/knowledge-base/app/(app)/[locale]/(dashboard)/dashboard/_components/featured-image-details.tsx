import { type ImageCaptionMode, resolveImageCaption } from "@dariah-eric/database/image-captions";
import { InlineRichTextRenderer } from "@dariah-eric/ui/inline-rich-text-renderer";
import { isEmptyRichTextDocument } from "@dariah-eric/ui/rich-text";
import type { JSONContent } from "@tiptap/core";
import type { ReactNode } from "react";

interface FeaturedImageDetailsProps {
	image: { url: string; alt?: string | null; caption?: JSONContent | null };
	/** The entity's own caption for this placement, shown when it overrides the asset's. */
	imageCaption?: JSONContent | null;
	imageCaptionMode?: ImageCaptionMode;
}

/**
 * A featured image as the website will render it: the picture, and the caption the entity's caption
 * mode resolves to. Details views exist so an editor can check what was saved, so they apply the
 * same resolution the API does rather than showing the asset's caption regardless - or, as before,
 * no caption at all.
 */
export function FeaturedImageDetails(props: Readonly<FeaturedImageDetailsProps>): ReactNode {
	const { image, imageCaption, imageCaptionMode } = props;

	const { caption } = resolveImageCaption({
		assetCaption: image.caption,
		blockCaption: imageCaption,
		/** Rows written before the column existed carry the mode implicitly, as everywhere else. */
		captionMode: imageCaptionMode ?? (imageCaption != null ? "override" : "inherit"),
	});

	return (
		<figure className="flex flex-col gap-y-2">
			<img
				alt={image.alt ?? ""}
				className="block-24 inline-auto max-inline-full rounded-lg object-contain"
				src={image.url}
			/>
			{!isEmptyRichTextDocument(caption) ? (
				<figcaption>
					<InlineRichTextRenderer className="text-muted-fg text-xs" content={caption!} />
				</figcaption>
			) : null}
		</figure>
	);
}
