import type { JSONContent } from "@tiptap/core";

/**
 * Finding the images a rich-text document holds itself, instead of leaving them to an `image`
 * content block, and planning what replaces them. Pure — no database, no network — so the decisions
 * can be tested; `import-embedded-images.ts` does the fetching and writing.
 *
 * Two kinds of node count as an embedded image:
 *
 * - `image`, Tiptap's stock node: a pasted or imported `<img>`, stored with whatever `src` it had —
 *   usually someone else's server. Its bytes have to be fetched and stored as an asset first.
 * - `assetImage` inside a body the editor never split: nested in a list or table, or in a body
 *   written before the split existed. It already names an asset by key, but nothing references that
 *   asset, so the public API cannot resolve it into a url, alt text or licence.
 */

type ImageLayout = "default" | "wide" | "full" | "float-start" | "float-end";
type ImageCaptionMode = "hidden" | "inherit" | "override";

/** Where an embedded image's bytes are: an asset already stored, a url to fetch, or nowhere. */
export type EmbeddedImageSource =
	| { kind: "asset"; imageKey: string }
	| { kind: "url"; src: string }
	| { kind: "none" };

export interface EmbeddedImage {
	source: EmbeddedImageSource;
	alt: string | null;
	caption: JSONContent | null;
	captionMode: ImageCaptionMode;
	layout: ImageLayout;
	/** Sat inside a list, table or quote, so the block it becomes is placed after that container. */
	isNested: boolean;
}

export type RewritePart =
	| { kind: "rich_text"; content: JSONContent }
	| { kind: "image"; image: EmbeddedImage };

const imageLayouts = new Set<string>(["default", "wide", "full", "float-start", "float-end"]);

/**
 * Containers whose schema requires at least one block child. Removing the only image from one would
 * leave an invalid document, so it is given the empty paragraph the editor would put there.
 */
const containersRequiringContent = new Set(["blockquote", "listItem", "tableCell", "tableHeader"]);

export function isEmbeddedImageNode(node: JSONContent): boolean {
	return node.type === "image" || node.type === "assetImage";
}

/** Whether a document holds an embedded image anywhere, at any depth. */
export function hasEmbeddedImages(content: JSONContent | null | undefined): boolean {
	if (content == null) {
		return false;
	}
	if (isEmbeddedImageNode(content)) {
		return true;
	}

	return (content.content ?? []).some((child) => hasEmbeddedImages(child));
}

function nonEmptyString(value: unknown): string | null {
	return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function toEmbeddedImage(node: JSONContent, isNested: boolean): EmbeddedImage {
	const attrs: Record<string, unknown> = node.attrs ?? {};

	let source: EmbeddedImageSource = { kind: "none" };
	if (node.type === "assetImage") {
		const imageKey = nonEmptyString(attrs.imageKey);
		if (imageKey != null) {
			source = { kind: "asset", imageKey };
		}
	} else {
		const src = nonEmptyString(attrs.src);
		if (src != null) {
			source = { kind: "url", src };
		}
	}

	const caption = (attrs.caption as JSONContent | null | undefined) ?? null;
	const storedCaptionMode = attrs.captionMode;
	const captionMode: ImageCaptionMode =
		storedCaptionMode === "hidden" ||
		storedCaptionMode === "inherit" ||
		storedCaptionMode === "override"
			? storedCaptionMode
			: caption != null
				? "override"
				: "inherit";

	return {
		source,
		alt: nonEmptyString(attrs.alt) ?? nonEmptyString(attrs.title),
		caption,
		captionMode,
		layout: imageLayouts.has(attrs.layout as string) ? (attrs.layout as ImageLayout) : "default",
		isNested,
	};
}

/** A node with every embedded image below it taken out, and the images it held, in order. */
function stripImages(node: JSONContent): { node: JSONContent; images: Array<EmbeddedImage> } {
	if (node.content == null) {
		return { node, images: [] };
	}

	const images: Array<EmbeddedImage> = [];
	const content: Array<JSONContent> = [];

	for (const child of node.content) {
		if (isEmbeddedImageNode(child)) {
			images.push(toEmbeddedImage(child, true));
			continue;
		}
		const stripped = stripImages(child);
		images.push(...stripped.images);
		content.push(stripped.node);
	}

	if (images.length === 0) {
		return { node, images };
	}

	if (content.length === 0 && node.type != null && containersRequiringContent.has(node.type)) {
		content.push({ type: "paragraph" });
	}

	return { node: { ...node, content }, images };
}

/**
 * Splits one rich-text body at its images: prose runs stay `rich_text`, each image becomes an
 * `image` block of its own, in place. An image nested in a list, table or quote cannot sit there as
 * a block, so it follows the top-level node it was in — the closest place to where the author put
 * it that a block can occupy.
 */
export function splitRichText(content: JSONContent): Array<RewritePart> {
	const parts: Array<RewritePart> = [];
	let run: Array<JSONContent> = [];

	function flush() {
		if (run.length > 0) {
			parts.push({ kind: "rich_text", content: { type: "doc", content: run } });
			run = [];
		}
	}

	for (const node of content.content ?? []) {
		if (isEmbeddedImageNode(node)) {
			flush();
			parts.push({ kind: "image", image: toEmbeddedImage(node, false) });
			continue;
		}

		const stripped = stripImages(node);
		run.push(stripped.node);

		if (stripped.images.length > 0) {
			flush();
			for (const image of stripped.images) {
				parts.push({ kind: "image", image });
			}
		}
	}

	flush();

	return parts;
}

/**
 * Takes the images out of a body that has to stay one document — a media block's prose. They become
 * blocks placed after the media block.
 */
export function extractFromBody(content: JSONContent): {
	content: JSONContent;
	images: Array<EmbeddedImage>;
} {
	const stripped = stripImages(content);

	const body =
		(stripped.node.content ?? []).length > 0
			? stripped.node
			: { ...stripped.node, content: [{ type: "paragraph" }] };

	return {
		content: body,
		images: stripped.images.map((image) => {
			return { ...image, isNested: true };
		}),
	};
}

/** A stable identity for a source, so one url used twice is fetched and stored once. */
export function sourceId(source: EmbeddedImageSource): string | null {
	switch (source.kind) {
		case "asset": {
			return `asset:${source.imageKey}`;
		}
		case "url": {
			return `url:${source.src}`;
		}
		case "none": {
			return null;
		}
	}
}

export type ResolvedPart =
	| { kind: "rich_text"; content: JSONContent }
	| { kind: "image"; image: EmbeddedImage; assetId: string };

/**
 * The parts to write once every source has been looked up, or `null` when the body must be left as
 * it is.
 *
 * An image whose source resolved to no asset — a key naming nothing, a url that would not download
 * — keeps the whole body untouched by default: the stored node is the only record of what the
 * author put there, and rewriting the rest around it would lose it. With `dropUnresolved`, such an
 * image is removed instead, which is what clearing the last of them out of the schema needs.
 */
export function resolveParts(
	parts: Array<RewritePart>,
	assetIdsBySource: ReadonlyMap<string, string>,
	dropUnresolved: boolean,
): Array<ResolvedPart> | null {
	const resolved: Array<ResolvedPart> = [];

	for (const part of parts) {
		if (part.kind === "rich_text") {
			const previous = resolved.at(-1);
			// Dropping an image can leave two prose runs side by side; they are one block again.
			if (previous?.kind === "rich_text") {
				previous.content = {
					type: "doc",
					content: [...(previous.content.content ?? []), ...(part.content.content ?? [])],
				};
			} else {
				resolved.push({ kind: "rich_text", content: part.content });
			}
			continue;
		}

		const id = sourceId(part.image.source);
		const assetId = id != null ? assetIdsBySource.get(id) : undefined;

		if (assetId == null) {
			if (!dropUnresolved) {
				return null;
			}
			continue;
		}

		resolved.push({ kind: "image", image: part.image, assetId });
	}

	return resolved;
}
