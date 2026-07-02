// oxlint-disable jsx-a11y/iframe-has-title

"use client";

import { resolveImageCaption } from "@dariah-eric/database/image-captions";
import { InlineRichTextRenderer } from "@dariah-eric/ui/inline-rich-text-renderer";
import { isEmptyRichTextDocument, toPlainText } from "@dariah-eric/ui/rich-text";
import { createRichTextExtensions } from "@dariah-eric/ui/rich-text-editor";
import type { JSONContent } from "@tiptap/core";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { getEmbedUrl } from "@/lib/embed-url";

const richTextExtensions = createRichTextExtensions();

/** Renders a richtext caption inside a `figcaption`, or nothing when the caption is empty. */
function CaptionFigcaption({
	caption,
}: Readonly<{ caption: JSONContent | null | undefined }>): ReactNode {
	if (isEmptyRichTextDocument(caption)) {
		return null;
	}

	return (
		<figcaption>
			<InlineRichTextRenderer content={caption!} />
		</figcaption>
	);
}

interface ContentBlocksViewProps {
	contentBlocks: Array<ContentBlock>;
}

export function ContentBlocksView({ contentBlocks }: Readonly<ContentBlocksViewProps>): ReactNode {
	return (
		<div className="flex flex-col gap-y-8">
			{contentBlocks.map((contentBlock) => (
				<ContentBlockView key={String(contentBlock.id)} contentBlock={contentBlock} />
			))}
		</div>
	);
}

interface ContentBlockViewProps {
	contentBlock: ContentBlock;
}

function ContentBlockView({ contentBlock }: Readonly<ContentBlockViewProps>): ReactNode {
	switch (contentBlock.type) {
		case "accordion": {
			const items = contentBlock.content?.items;

			if (!items || items.length === 0) {
				return null;
			}

			return (
				<div className="flex flex-col divide-y divide-border rounded-lg border border-border">
					{items.map((accordionItem, idx) => (
						<details key={idx} className="group px-4">
							<summary className="flex cursor-pointer items-center justify-between py-3 text-sm font-medium">
								{accordionItem.title}
								<svg
									className="block-4 inline-4 shrink-0 transition-transform group-open:rotate-180"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										d="M19 9l-7 7-7-7"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
									/>
								</svg>
							</summary>
							{accordionItem.content != null && (
								<div className="richtext richtext-sm pbe-3">
									{renderToReactElement({
										content: accordionItem.content,
										extensions: richTextExtensions,
									})}
								</div>
							)}
						</details>
					))}
				</div>
			);
		}

		case "data": {
			return null;
		}

		case "embed": {
			const url = contentBlock.content?.url;
			const title = contentBlock.content?.title;
			const caption = contentBlock.content?.caption;

			if (url == null || !url) {
				return null;
			}

			const embedUrl = getEmbedUrl(url);

			return (
				<figure>
					<div className="aspect-video inline-full overflow-hidden rounded-lg">
						<iframe
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowFullScreen={true}
							className="block-full inline-full"
							sandbox="allow-scripts allow-same-origin allow-presentation"
							src={embedUrl}
							title={title ?? embedUrl}
						/>
					</div>
					<CaptionFigcaption caption={caption} />
				</figure>
			);
		}

		case "gallery": {
			const layout = contentBlock.content?.layout ?? "grid";
			const items = contentBlock.content?.items ?? [];

			if (items.length === 0) {
				return null;
			}

			if (layout === "carousel") {
				return (
					<div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pbe-2">
						{items.map((item, idx) => {
							if (item.imageUrl == null || item.imageUrl === "") {
								return null;
							}

							return (
								<figure key={idx} className="inline-[min(20rem,80vw)] shrink-0 snap-start">
									<img
										alt={toPlainText(item.caption)}
										className="aspect-4/3 inline-full rounded-lg object-cover"
										src={item.imageUrl}
									/>
									<CaptionFigcaption caption={item.caption} />
								</figure>
							);
						})}
					</div>
				);
			}

			return (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item, idx) => {
						if (item.imageUrl == null || item.imageUrl === "") {
							return null;
						}

						return (
							<figure key={idx}>
								<img
									alt={toPlainText(item.caption)}
									className="aspect-4/3 inline-full rounded-lg object-cover"
									src={item.imageUrl}
								/>
								<CaptionFigcaption caption={item.caption} />
							</figure>
						);
					})}
				</div>
			);
		}

		case "hero": {
			const title = contentBlock.content?.title;
			const eyebrow = contentBlock.content?.eyebrow;
			const imageUrl = contentBlock.content?.imageUrl;
			const ctas = contentBlock.content?.ctas;

			if (title == null || !title) {
				return null;
			}

			return (
				<div className="flex flex-col gap-y-4">
					{eyebrow != null && (
						<p className="text-sm font-medium uppercase tracking-wide text-muted-fg">{eyebrow}</p>
					)}
					<h2 className="text-2xl font-bold">{title}</h2>
					{imageUrl != null && (
						<img alt="" className="inline-full rounded-lg object-cover" src={imageUrl} />
					)}
					{ctas != null && ctas.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{ctas.map((cta, idx) => (
								<a
									key={idx}
									className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg"
									href={cta.url}
								>
									{cta.label}
								</a>
							))}
						</div>
					)}
				</div>
			);
		}

		case "image": {
			const imageUrl = contentBlock.content?.imageUrl;
			const captionMode =
				contentBlock.content?.captionMode ??
				(contentBlock.content?.caption != null ? "override" : "inherit");
			const { caption } = resolveImageCaption({
				assetCaption: contentBlock.content?.assetCaption,
				blockCaption: contentBlock.content?.caption,
				captionMode,
			});

			if (imageUrl == null || !imageUrl) {
				return null;
			}

			return (
				<figure>
					<img alt={contentBlock.content?.alt ?? ""} src={imageUrl} />
					<CaptionFigcaption caption={caption} />
				</figure>
			);
		}

		case "rich_text": {
			if (!contentBlock.content) {
				return null;
			}

			return (
				<div className="richtext richtext-sm">
					{renderToReactElement({ content: contentBlock.content, extensions: richTextExtensions })}
				</div>
			);
		}

		default: {
			return null;
		}
	}
}
