// oxlint-disable jsx-a11y/iframe-has-title

"use client";

import { type ImageCaptionMode, resolveImageCaption } from "@dariah-eric/database/image-captions";
import { ButtonLink } from "@dariah-eric/ui/button-link";
import { InlineRichTextRenderer } from "@dariah-eric/ui/inline-rich-text-renderer";
import { Note } from "@dariah-eric/ui/note";
import { collectFootnotes, isEmptyRichTextDocument, toPlainText } from "@dariah-eric/ui/rich-text";
import { createRichTextExtensions } from "@dariah-eric/ui/rich-text-editor";
import type { JSONContent } from "@tiptap/core";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

import type { ContentBlock } from "@/lib/content-block-types";
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

	// An entity link stores only a document id, and turning that into a url needs a lookup this
	// client component cannot do — unlike an asset key, which is a url by string substitution. So the
	// preview cannot make it clickable, and must not claim to know whether it still resolves. It is
	// marked as a reference instead, so an editor can tell a working link from a broken one rather
	// than seeing both as bare text.
	if (attrs.targetKind === "entity") {
		return (
			<span
				className="underline decoration-dotted underline-offset-2 text-muted-fg"
				title="Links to a page on the website. Its address is resolved when the site renders it."
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

const richTextRenderOptions = {
	markMapping: { link: renderLinkMark },
	nodeMapping: { buttonLink: renderButtonLinkNode },
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

/**
 * Which surface the blocks are being rendered on — not a property of the entity, which is why it is
 * not a caller-supplied option: the two surfaces have their own entry points below, so a page
 * cannot pick the wrong one by omission. Only the `hero` block differs so far: it is a page-level
 * banner, and a banner shown at full size inside an editor's form is noise.
 */
type ContentBlocksViewVariant = "preview" | "public";

export type HeroContentBlockContent = Extract<ContentBlock, { type: "hero" }>["content"];

interface HeroSectionProps {
	content: HeroContentBlockContent;
	/**
	 * `"h1"` only where the hero replaces the page's own heading — the home page. Everywhere else the
	 * page already has an `h1` above the content blocks.
	 */
	headingLevel?: "h1" | "h2";
	/** Rendered in the call-to-action row, after any CTAs configured on the block. */
	ctaSlot?: ReactNode;
}

/**
 * The public rendering of a `hero` block. Exported so the home page can render its leading hero as
 * the page heading and hand in the session-dependent call to action, which cannot be expressed as a
 * configured CTA because its target and label depend on who is looking.
 */
export function HeroSection(props: Readonly<HeroSectionProps>): ReactNode {
	const { content, ctaSlot, headingLevel: Heading = "h2" } = props;

	const title = content?.title;
	const subtitle = content?.subtitle;
	const eyebrow = content?.eyebrow;
	const imageUrl = content?.imageUrl;
	const ctas = content?.ctas ?? [];

	if (title == null || !title) {
		return null;
	}

	const { caption } = resolveImageCaption({
		assetCaption: content?.asset?.caption,
		blockCaption: content?.caption,
		captionMode: content?.captionMode ?? (content?.caption != null ? "override" : "inherit"),
	});

	return (
		<div className="flex flex-col items-center gap-y-6 text-center">
			<div className="flex flex-col items-center gap-y-4">
				{eyebrow != null && eyebrow !== "" ? (
					<p className="text-sm font-medium tracking-wide text-text-weak uppercase">{eyebrow}</p>
				) : null}
				<Heading className="text-balance text-5xl font-extrabold tracking-tight text-text-strong sm:text-6xl">
					{title}
				</Heading>
				{subtitle != null && subtitle !== "" ? (
					<p className="max-inline-(--breakpoint-sm) text-balance text-xl/relaxed text-text-weak">
						{subtitle}
					</p>
				) : null}
			</div>
			{imageUrl != null ? (
				<figure className="inline-full">
					<img alt="" className="inline-full rounded-lg object-cover" src={imageUrl} />
					<CaptionFigcaption caption={caption} />
				</figure>
			) : null}
			{ctas.length > 0 || ctaSlot != null ? (
				<div className="flex flex-col gap-3 sm:flex-row">
					{/* Configured CTAs are secondary: the primary action, where there is one, comes from the
					    page via `ctaSlot` — an editor cannot know what it should say. */}
					{ctas.map((cta, index) => (
						<ButtonLink
							key={index}
							className="min-inline-40"
							href={cta.url}
							intent="outline"
							size="lg"
						>
							{cta.label}
						</ButtonLink>
					))}
					{ctaSlot}
				</div>
			) : null}
		</div>
	);
}

interface ContentBlocksViewProps {
	contentBlocks: Array<ContentBlock>;
}

/** The dashboard's compact rendering, which has to stay legible inside a description list. */
export function ContentBlocksView(props: Readonly<ContentBlocksViewProps>): ReactNode {
	const { contentBlocks } = props;

	return <ContentBlocksList contentBlocks={contentBlocks} variant="preview" />;
}

/** What a reader gets on the site. */
export function PublicContentBlocksView(props: Readonly<ContentBlocksViewProps>): ReactNode {
	const { contentBlocks } = props;

	return <ContentBlocksList contentBlocks={contentBlocks} variant="public" />;
}

interface ContentBlocksListProps extends ContentBlocksViewProps {
	variant: ContentBlocksViewVariant;
}

function isFloatedImage(contentBlock: ContentBlock | undefined): boolean {
	return (
		contentBlock?.type === "image" &&
		(contentBlock.content?.layout === "float-start" || contentBlock.content?.layout === "float-end")
	);
}

function ContentBlocksList({
	contentBlocks,
	variant,
}: Readonly<ContentBlocksListProps>): ReactNode {
	// Footnote markers are numbered by a CSS counter rooted on the element below (`footnotes`), so the
	// count runs across the whole article rather than restarting per block — blocks are a storage
	// split of one document, and a reader sees one sequence of notes.
	const footnotes = collectFootnotes(contentBlocks);

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
			{contentBlocks.map((contentBlock, index) => {
				const wrapsPrecedingFloat =
					contentBlock.type === "rich_text" && isFloatedImage(contentBlocks[index - 1]);

				return (
					<div
						className={wrapsPrecedingFloat ? undefined : "clear-both"}
						key={String(contentBlock.id)}
					>
						<ContentBlockView contentBlock={contentBlock} variant={variant} />
					</div>
				);
			})}
			{/* The notes themselves, collected out of the blocks in the order their markers appear. The
			    public site assembles this section the same way — from the document, not from a stored
			    list — so what an editor proof-reads here is what a reader gets. */}
			{footnotes.length > 0 ? (
				<section aria-label="Footnotes" className="clear-both border-bs border-border pbs-4">
					<h2 className="text-xs font-medium tracking-wide text-muted-fg uppercase">
						{"Footnotes"}
					</h2>
					<ol className="mbs-2 list-decimal space-y-1 ps-5 text-sm">
						{footnotes.map((note, index) => (
							<li key={index}>{note != null ? <InlineRichTextRenderer content={note} /> : null}</li>
						))}
					</ol>
				</section>
			) : null}
		</div>
	);
}

interface ContentBlockViewProps {
	contentBlock: ContentBlock;
	variant: ContentBlocksViewVariant;
}

function ContentBlockView({ contentBlock, variant }: Readonly<ContentBlockViewProps>): ReactNode {
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
			if (variant === "public") {
				return <HeroSection content={contentBlock.content} />;
			}

			const title = contentBlock.content?.title;
			const subtitle = contentBlock.content?.subtitle;
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
					{subtitle != null && subtitle !== "" && (
						<p className="text-sm text-muted-fg">{subtitle}</p>
					)}
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
				wide: "ms-auto me-auto inline-[min(56rem,92vw)]",
				full: "inline-[100vw] ms-[calc(50%-50vw)] me-[calc(50%-50vw)]",
				default: undefined,
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
