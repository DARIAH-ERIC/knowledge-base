"use client";

import { StarterKit } from "@tiptap/starter-kit";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";

function getEmbedUrl(url: string): string {
	const watchMatch = /youtube\.com\/watch\?.*?v=([\w-]+)/.exec(url);
	if (watchMatch != null) {
		return `https://www.youtube-nocookie.com/embed/${watchMatch[1]!}`;
	}

	const shortMatch = /youtu\.be\/([\w-]+)/.exec(url);
	if (shortMatch != null) {
		return `https://www.youtube-nocookie.com/embed/${shortMatch[1]!}`;
	}

	return url;
}

interface ContentBlocksViewProps {
	contentBlocks: Array<ContentBlock>;
}

export function ContentBlocksView({ contentBlocks }: Readonly<ContentBlocksViewProps>): ReactNode {
	return contentBlocks.map((contentBlock) => {
		return <ContentBlockView key={String(contentBlock.id)} contentBlock={contentBlock} />;
	});
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
					{items.map((accordionItem, idx) => {
						return (
							<details key={idx} className="group px-4">
								<summary className="flex cursor-pointer items-center justify-between py-3 text-sm font-medium">
									{accordionItem.title}
									<svg
										className="size-4 shrink-0 transition-transform group-open:rotate-180"
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
									<div className="richtext richtext-sm pb-3">
										{renderToReactElement({
											content: accordionItem.content,
											extensions: [StarterKit],
										})}
									</div>
								)}
							</details>
						);
					})}
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
					<div className="aspect-video w-full overflow-hidden rounded-lg">
						<iframe
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowFullScreen={true}
							className="size-full"
							sandbox="allow-scripts allow-same-origin allow-presentation"
							src={embedUrl}
							title={title ?? embedUrl}
						/>
					</div>
					{caption != null ? <figcaption>{caption}</figcaption> : null}
				</figure>
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
						<img alt="" className="w-full rounded-lg object-cover" src={imageUrl} />
					)}
					{ctas != null && ctas.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{ctas.map((cta, idx) => {
								return (
									<a
										key={idx}
										className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg"
										href={cta.url}
									>
										{cta.label}
									</a>
								);
							})}
						</div>
					)}
				</div>
			);
		}

		case "image": {
			const imageUrl = contentBlock.content?.imageUrl;
			const caption = contentBlock.content?.caption;

			if (imageUrl == null || !imageUrl) {
				return null;
			}

			return (
				<figure>
					<img alt={caption ?? ""} src={imageUrl} />
					{caption != null ? <figcaption>{caption}</figcaption> : null}
				</figure>
			);
		}

		case "rich_text": {
			if (!contentBlock.content) {
				return null;
			}

			return (
				<div className="richtext richtext-sm">
					{renderToReactElement({ content: contentBlock.content, extensions: [StarterKit] })}
				</div>
			);
		}

		default: {
			return null;
		}
	}
}
