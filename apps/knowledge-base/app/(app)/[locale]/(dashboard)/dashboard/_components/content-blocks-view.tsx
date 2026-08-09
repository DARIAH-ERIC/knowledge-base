// oxlint-disable jsx-a11y/iframe-has-title

"use client";

import { type ImageCaptionMode, resolveImageCaption } from "@dariah-eric/database/image-captions";
import { ButtonLink } from "@dariah-eric/ui/button-link";
import { InlineRichTextRenderer } from "@dariah-eric/ui/inline-rich-text-renderer";
import { Note } from "@dariah-eric/ui/note";
import {
	attachHeadingIds,
	collectFootnotes,
	isEmptyRichTextDocument,
	numberFootnotes,
	toPlainText,
} from "@dariah-eric/ui/rich-text";
import { createRichTextExtensions } from "@dariah-eric/ui/rich-text-editor";
import type { JSONContent } from "@tiptap/core";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { type ReactNode, useId } from "react";
import { twMerge } from "tailwind-merge";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { getEmbedUrl } from "@/lib/embed-url";

const richTextExtensions = createRichTextExtensions();

/**
 * The static renderer serialises each node via its extension `renderHTML`, which for the inline
 * `buttonLink` node is a bare `<a data-button-link>` — indistinguishable from a normal link. Render
 * it as the styled `ButtonLink` instead, mirroring the editor's read-only node view.
 */
function renderButtonLinkNode({
	node,
}: Readonly<{ node: { attrs?: Record<string, unknown> | null } }>): ReactNode {
	const attrs = node.attrs ?? {};
	const href = typeof attrs.href === "string" ? attrs.href : "#";
	const label = typeof attrs.label === "string" ? attrs.label : "Button";
	const intent =
		attrs.variant === "secondary" || attrs.variant === "outline" ? attrs.variant : "primary";

	return (
		<ButtonLink href={href} intent={intent} size="sm">
			{label}
		</ButtonLink>
	);
}

/**
 * A link that points at an asset stores only its key — the download url is resolved at read time,
 * and the API does that for the public site (`annotateLinkTargets`). The dashboard reads content
 * blocks straight from the database instead, so the preview resolves the key here, against the
 * dashboard's own download route. Everything else about the link renders as usual.
 */
function renderLinkMark({
	mark,
	children,
}: Readonly<{
	mark: { attrs?: Record<string, unknown> | null };
	children?: ReactNode | Array<ReactNode>;
}>): ReactNode {
	const attrs = mark.attrs ?? {};
	const assetKey = typeof attrs.assetKey === "string" ? attrs.assetKey : null;

	// An entity link stores only a document id. The read path names it (`resolveEntityLinksInContent
	// Blocks`) but attaches no url — building one means the website's per-type routing, which lives
	// in the public API — so the preview says which page the link leads to without being clickable.
	//
	// An id that resolved to nothing is called out rather than passed over: deleted, unpublished and
	// page-less targets all render as plain text on the website, and an editor proof-reading a page
	// needs to see that while they can still fix it.
	if (attrs.targetKind === "entity") {
		const entity = attrs.entity as { label?: unknown } | null | undefined;
		const label = typeof entity?.label === "string" ? entity.label : null;

		return label != null ? (
			<span
				className="underline decoration-dotted underline-offset-2 text-muted-fg"
				title={`Links to “${label}” on the website. Its address is resolved when the site renders it.`}
			>
				{children}
			</span>
		) : (
			<span
				className="underline decoration-wavy underline-offset-2 text-danger"
				title="This link points to a page that is no longer published, so it will render as plain text."
			>
				{children}
			</span>
		);
	}

	const href =
		attrs.targetKind === "asset" && assetKey != null
			? `/api/assets/download?key=${encodeURIComponent(assetKey)}`
			: typeof attrs.href === "string"
				? attrs.href
				: undefined;

	// A link with no href at all is broken — a reference whose target is gone, or malformed content.
	// Rendering an anchor without an href would look identical to a working link.
	if (href == null) {
		return (
			<span
				className="underline decoration-wavy underline-offset-2 text-danger"
				title="This link has no target."
			>
				{children}
			</span>
		);
	}

	return (
		<a
			href={href}
			rel={typeof attrs.rel === "string" ? attrs.rel : undefined}
			target={typeof attrs.target === "string" ? attrs.target : undefined}
		>
			{children}
		</a>
	);
}

/**
 * The marker, as a link to its note. The node's own `renderHTML` is a bare `<sup data-footnote>`,
 * which cannot anchor itself: it has no idea where it sits in the document, and the number comes
 * from a CSS counter. `numberFootnotes` attaches the position, and this turns it into the anchor
 * pair the note links back to.
 *
 * `fn1`/`fnref1` and the `doc-noteref`/`doc-backlink` roles are Pandoc's convention, which is what
 * most markdown-to-html pipelines emit — worth matching for anything that ever reads these pages.
 *
 * The number is written as text rather than left to the `footnotes` CSS counter: it is already
 * known here, and generated content is neither announced, selectable nor copied. An empty marker
 * still falls back to the counter (see the utility) — that is what the editor renders.
 */
function renderFootnoteNode({
	node,
}: Readonly<{ node: { attrs?: Record<string, unknown> | null } }>): ReactNode {
	const number = node.attrs?.number;

	if (typeof number !== "number") {
		return <sup data-footnote="" />;
	}

	return (
		<a
			aria-label={`Footnote ${String(number)}`}
			href={`#fn${String(number)}`}
			id={`fnref${String(number)}`}
			role="doc-noteref"
		>
			<sup data-footnote="">{number}</sup>
		</a>
	);
}

/**
 * A heading, anchored. The node's own `renderHTML` emits a bare `<h2>`–`<h4>`, which nothing can
 * link to — the anchor is not stored on the heading but derived at read time by `attachHeadingIds`
 * (see below), the same way a footnote's number is. Writing it into the `id` here is what lets a
 * page's table of contents send a reader to a section.
 *
 * Nothing sets a scroll offset: the global `:target` rule already keeps whatever was jumped to
 * clear of the top edge, and it should stay the one place that decides by how much.
 */
function renderHeadingNode({
	node,
	children,
}: Readonly<{
	node: { attrs?: Record<string, unknown> | null };
	children?: ReactNode | Array<ReactNode>;
}>): ReactNode {
	const attrs = node.attrs ?? {};
	const level = typeof attrs.level === "number" ? Math.min(Math.max(attrs.level, 1), 6) : 1;
	const id = typeof attrs.id === "string" ? attrs.id : undefined;
	const Heading = `h${String(level)}` as "h2";

	return <Heading id={id}>{children}</Heading>;
}

const richTextRenderOptions = {
	markMapping: { link: renderLinkMark },
	nodeMapping: {
		buttonLink: renderButtonLinkNode,
		footnote: renderFootnoteNode,
		heading: renderHeadingNode,
	},
};

/** Gallery items follow the same caption model as image blocks: inherit, override, or hide. */
function resolveGalleryItemCaption(item: {
	asset?: { caption?: JSONContent | null } | undefined;
	caption?: JSONContent | null;
	captionMode?: ImageCaptionMode;
}) {
	return resolveImageCaption({
		assetCaption: item.asset?.caption,
		blockCaption: item.caption,
		captionMode: item.captionMode ?? (item.caption != null ? "override" : "inherit"),
	});
}

/**
 * A figure that stacks in the content flow reads as crowded at the `space-y-4` block gap alone —
 * that gap is the paragraph rhythm, and the richtext scale gives a figure roughly twice it. These
 * figures sit outside any `richtext` container though (see `CaptionFigcaption`), so that rule never
 * reaches them.
 *
 * Padding rather than margin: the block gap is itself a margin, and the wrapper around each block
 * has neither padding nor border, so a margin here would collapse into it and mostly vanish.
 *
 * Only for figures in the flow. A floated figure keeps the margins tuned at its call site — padding
 * would grow the box the text wraps around and drop the image below the line it aligns to — and
 * gallery items are spaced by their grid.
 */
const blockFigurePadding = "py-2";

/** Renders a richtext caption inside a `figcaption`, or nothing when the caption is empty. */
function CaptionFigcaption({
	caption,
	className,
}: Readonly<{ caption: JSONContent | null | undefined; className?: string }>): ReactNode {
	if (isEmptyRichTextDocument(caption)) {
		return null;
	}

	return (
		/*
		 * These figures sit outside any `richtext` container, so the `figcaption` styling that comes
		 * with that scale never reaches them and a caption renders as ordinary body copy.
		 *
		 * The type has to be set on the renderer rather than on the `figcaption`: the renderer emits
		 * its own `richtext` wrapper, which re-declares colour and size, so anything inherited from
		 * the `figcaption` is overridden before it reaches the text. The element keeps the spacing.
		 */
		<figcaption className={twMerge("mbs-2", className)}>
			<InlineRichTextRenderer className="text-xs text-muted-fg" content={caption!} />
		</figcaption>
	);
}

interface ContentBlocksViewProps {
	contentBlocks: Array<ContentBlock>;
}

function isFloatedImage(contentBlock: ContentBlock | undefined): boolean {
	return (
		contentBlock?.type === "image" &&
		(contentBlock.content?.layout === "float-start" || contentBlock.content?.layout === "float-end")
	);
}

export function ContentBlocksView({ contentBlocks }: Readonly<ContentBlocksViewProps>): ReactNode {
	// Footnote markers are numbered by a CSS counter rooted on the element below (`footnotes`), so the
	// count runs across the whole article rather than restarting per block — blocks are a storage
	// split of one document, and a reader sees one sequence of notes.
	//
	// `numberFootnotes` walks the same markers in the same order to attach that position as an
	// attribute, which is what lets a marker link to its note: a counter can show a number but cannot
	// put it in an `id`.
	//
	// Heading anchors are derived the same way and for the same reason — `collectHeadings` walks the
	// identical order to build a page's table of contents, so the two agree on which heading an
	// entry points at. Numbering runs first: `attachHeadingIds` hands a heading node back untouched
	// apart from its `attrs`, so a marker inside a heading keeps the number it was just given.
	const numbered = attachHeadingIds(numberFootnotes(contentBlocks));
	const footnotes = collectFootnotes(numbered);
	const footnotesLabelId = useId();

	// Normal document flow (not a flex column) so a floated `image` block's float escapes into the
	// following block and the text wraps around it. The immediately-following `rich_text` is allowed
	// to wrap; every other block clears, so a float can never overlap a structural block below it.
	// `@container` makes the float/full-width switch depend on the content column's width (via a
	// container query on floated images), not on the viewport.
	//
	// Blocks are a storage split of one document, so the boundary should be invisible: `space-y-4`
	// is the same 1rem the richtext scale puts between paragraphs (and, after margin collapsing,
	// after a heading). Each block zeroes its own first/last child margins, so this gap is the whole
	// spacing story — no per-block or neighbour-aware adjustment.
	return (
		<div className="@container footnotes space-y-4">
			{numbered.map((contentBlock, index) => {
				const wrapsPrecedingFloat =
					contentBlock.type === "rich_text" && isFloatedImage(numbered[index - 1]);

				return (
					<div
						className={wrapsPrecedingFloat ? undefined : "clear-both"}
						key={String(contentBlock.id)}
					>
						<ContentBlockView contentBlock={contentBlock} />
					</div>
				);
			})}
			{/* The notes themselves, collected out of the blocks in the order their markers appear. The
			    public site assembles this section the same way — from the document, not from a stored
			    list — so what an editor proof-reads here is what a reader gets. */}
			{footnotes.length > 0 ? (
				/*
				 * Labelled by its own caption rather than by a heading. A heading would have to pick a
				 * level, and this component cannot know one — it renders wherever a details page puts it
				 * (today inside a `dd`), under content that brings its own `h2`–`h4`. Naming the section
				 * from the visible text also beats repeating it in an `aria-label`.
				 */
				<section
					aria-labelledby={footnotesLabelId}
					className="clear-both border-bs border-border pbs-4"
					role="doc-endnotes"
				>
					<p
						className="text-xs font-medium tracking-wide text-muted-fg uppercase"
						id={footnotesLabelId}
					>
						{"Footnotes"}
					</p>
					<ol className="mbs-2 list-decimal space-y-1 ps-5 text-sm">
						{footnotes.map((note, index) => {
							const number = index + 1;

							return (
								<li id={`fn${String(number)}`} key={index}>
									{/* Inline: the backlink belongs at the end of the note's last line, not under it. */}
									{note != null ? <InlineRichTextRenderer content={note} isInline={true} /> : null}
									{/* Non-breaking, so a note that fills its last line cannot leave the arrow stranded
									    on a line of its own — the very thing the inline rendering above avoids. */}
									{"\u00A0"}
									<a
										aria-label={`Back to footnote ${String(number)} in the text`}
										className="text-muted-fg no-underline"
										href={`#fnref${String(number)}`}
										role="doc-backlink"
									>
										{"↩"}
									</a>
								</li>
							);
						})}
					</ol>
				</section>
			) : null}
		</div>
	);
}

interface ContentBlockViewProps {
	contentBlock: ContentBlock;
}

function ContentBlockView({ contentBlock }: Readonly<ContentBlockViewProps>): ReactNode {
	switch (contentBlock.type) {
		case "callout": {
			const content = contentBlock.content?.content;
			const intent = contentBlock.content?.intent ?? "info";
			const title = contentBlock.content?.title;
			if (content == null) {
				return null;
			}

			return (
				<aside aria-label={title ?? `${intent} callout`}>
					<Note intent={intent === "neutral" ? "default" : intent}>
						{title != null ? <strong className="mbe-1 block">{title}</strong> : null}
						<InlineRichTextRenderer content={content} />
					</Note>
				</aside>
			);
		}

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
										options: richTextRenderOptions,
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
				<figure className={blockFigurePadding}>
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

							const { caption } = resolveGalleryItemCaption(item);

							return (
								<figure key={idx} className="inline-[min(20rem,80vw)] shrink-0 snap-start">
									<img
										alt={toPlainText(caption)}
										className="aspect-4/3 inline-full rounded-lg object-cover"
										src={item.imageUrl}
									/>
									<CaptionFigcaption caption={caption} />
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

						const { caption } = resolveGalleryItemCaption(item);

						return (
							<figure key={idx}>
								<img
									alt={toPlainText(caption)}
									className="aspect-4/3 inline-full rounded-lg object-cover"
									src={item.imageUrl}
								/>
								<CaptionFigcaption caption={caption} />
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

			const { caption } = resolveImageCaption({
				assetCaption: contentBlock.content?.asset?.caption,
				blockCaption: contentBlock.content?.caption,
				captionMode:
					contentBlock.content?.captionMode ??
					(contentBlock.content?.caption != null ? "override" : "inherit"),
			});

			return (
				<div className="flex flex-col gap-y-4">
					{eyebrow != null && (
						<p className="text-sm font-medium uppercase tracking-wide text-muted-fg">{eyebrow}</p>
					)}
					<h2 className="text-2xl font-bold">{title}</h2>
					{imageUrl != null && (
						<figure>
							<img alt="" className="inline-full rounded-lg object-cover" src={imageUrl} />
							<CaptionFigcaption caption={caption} />
						</figure>
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

			const layout = contentBlock.content?.layout ?? "default";
			// `float-*` only floats once the content column (a `@container`, not the viewport) is wide
			// enough (`@lg` ≈ 32rem): a constrained image pulled aside with the following block's text
			// wrapping, natural aspect ratio so portrait images show in full, and gap on the text side.
			// In a narrower column it spans the full width so text never wraps in a cramped column.
			// `wide`/`full` break out past the text column; `default` fills the column.
			const figureClassName = {
				"float-start": "mbe-4 @lg:mbe-2 @lg:me-6 @lg:float-start @lg:inline-[min(18rem,45%)]",
				"float-end": "mbe-4 @lg:mbe-2 @lg:ms-6 @lg:float-end @lg:inline-[min(18rem,45%)]",
				wide: `${blockFigurePadding} ms-auto me-auto inline-[min(56rem,92vw)]`,
				full: `${blockFigurePadding} inline-[100vw] ms-[calc(50%-50vw)] me-[calc(50%-50vw)]`,
				default: blockFigurePadding,
			}[layout];

			return (
				<figure className={figureClassName}>
					<img alt={contentBlock.content?.alt ?? ""} src={imageUrl} />
					<CaptionFigcaption caption={caption} />
				</figure>
			);
		}

		case "media_text": {
			const imageUrl = contentBlock.content?.imageUrl;
			const alt = contentBlock.content?.alt;
			const side = contentBlock.content?.side ?? "start";
			const content = contentBlock.content?.content;
			const captionMode =
				contentBlock.content?.captionMode ??
				(contentBlock.content?.caption != null ? "override" : "inherit");
			const { caption } = resolveImageCaption({
				assetCaption: contentBlock.content?.assetCaption,
				blockCaption: contentBlock.content?.caption,
				captionMode,
			});

			if (imageUrl == null || !imageUrl || content == null) {
				return null;
			}

			return (
				<div className="flow-root">
					<figure
						className={
							// The image keeps its fixed square size; the figure grows for the caption, so a
							// credit sits under the image inside the same 9rem column.
							//
							// It only floats once the content column (a `@container`, not the viewport) can
							// spare the width: below `@sm` (≈24rem) a 9rem float plus its gutter leaves the
							// text too narrow to wrap cleanly, so the pairing stacks instead — image on its
							// own line, text below. Unlike an `image` block it never stretches to fill the
							// column: this is a thumbnail (a portrait, a logo), and upscaling it would look
							// worse than the narrow column does. `mbs-1.5` nudges the floated image down to
							// the text's cap height — the first line's half-leading otherwise makes the
							// top-aligned text look lower than the image — so it rides along with the float.
							side === "end"
								? "mbe-2 inline-36 @sm:mbs-1.5 @sm:ms-4 @sm:float-end"
								: "mbe-2 inline-36 @sm:mbs-1.5 @sm:me-4 @sm:float-start"
						}
					>
						<img
							alt={alt ?? ""}
							className="block-36 inline-full rounded-lg object-cover"
							src={imageUrl}
						/>
						<CaptionFigcaption caption={caption} className="mbs-1" />
					</figure>
					<div className="richtext richtext-sm">
						{renderToReactElement({
							content,
							extensions: richTextExtensions,
							options: richTextRenderOptions,
						})}
					</div>
				</div>
			);
		}

		case "rich_text": {
			if (!contentBlock.content) {
				return null;
			}

			return (
				<div className="richtext richtext-sm">
					{renderToReactElement({
						content: contentBlock.content,
						extensions: richTextExtensions,
						options: richTextRenderOptions,
					})}
				</div>
			);
		}

		default: {
			return null;
		}
	}
}
