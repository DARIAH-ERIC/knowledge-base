import { type ImageCaptionMode, resolveImageCaption } from "@dariah-eric/database/image-captions";
import type { JSONContent } from "@tiptap/core";

import { images } from "@/services/images";

export interface ImageAsset {
	key: string;
	alt: string | null;
	caption: JSONContent | null;
	license: { name: string | null; url: string | null } | null;
}

export interface Image {
	url: string;
	alt: string | null;
	caption: JSONContent | null;
	license: { name: string; url: string } | null;
}

/**
 * Build an {@link ImageAsset} from a flat row whose license columns were selected as siblings.
 * Useful for query-builder selects, which don't support the nested `license` object that the
 * relational query API produces.
 */
interface FlatImageAsset {
	key: string;
	alt: string | null;
	caption: JSONContent | null;
	licenseName: string | null;
	licenseUrl: string | null;
}

export function toImageAsset(image: FlatImageAsset): ImageAsset;
export function toImageAsset(
	image: { key: string | null } & Omit<FlatImageAsset, "key">,
): ImageAsset | null;
export function toImageAsset(
	image: { key: string | null } & Omit<FlatImageAsset, "key">,
): ImageAsset | null {
	if (image.key == null) {
		return null;
	}

	return {
		key: image.key,
		alt: image.alt,
		caption: image.caption,
		license: { name: image.licenseName, url: image.licenseUrl },
	};
}

interface FeaturedImageCaption {
	imageCaption: JSONContent | null;
	imageCaptionMode: ImageCaptionMode;
}

/**
 * Applies an entity's caption choice to its featured image: the caption belongs to the asset and is
 * shared by every placement, so an entity either inherits it, replaces it for its own page, or
 * suppresses it. Consumers only ever see the resolved caption, exactly as for image content
 * blocks.
 *
 * **Every serializer of an image whose table carries `image_caption`/`image_caption_mode` must go
 * through here** — `news`, `events`, `funding_calls`, `impact_case_studies`, `opportunities`,
 * `spotlight_articles` and `persons`. A query that selects the asset's `caption` but not those two
 * columns compiles and returns a plausible-looking response that ignores the editor's choice, which
 * is how `/featured-entities` once served asset captions while `/news` served the right ones.
 * Tables without those columns (projects, pages, organisational units, logos) pass their image
 * straight to {@link generateImageUrl}.
 */
export function withResolvedCaption(image: ImageAsset, entity: FeaturedImageCaption): ImageAsset;
export function withResolvedCaption(
	image: ImageAsset | null | undefined,
	entity: FeaturedImageCaption,
): ImageAsset | null;
export function withResolvedCaption(
	image: ImageAsset | null | undefined,
	entity: FeaturedImageCaption,
): ImageAsset | null {
	if (image == null) {
		return null;
	}

	const { caption } = resolveImageCaption({
		assetCaption: image.caption,
		blockCaption: entity.imageCaption,
		captionMode: entity.imageCaptionMode,
	});

	return { ...image, caption };
}

export function generateImageUrl(image: ImageAsset, width: number): Image;
export function generateImageUrl(image: ImageAsset | null | undefined, width: number): Image | null;
export function generateImageUrl(
	image: ImageAsset | null | undefined,
	width: number,
): Image | null {
	if (image == null) {
		return null;
	}

	const { url } = images.generateSignedImageUrl({ key: image.key, options: { width } });

	const license =
		image.license?.name != null && image.license.url != null
			? { name: image.license.name, url: image.license.url }
			: null;

	return { url, alt: image.alt, caption: image.caption, license };
}
