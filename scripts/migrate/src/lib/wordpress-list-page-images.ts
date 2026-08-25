import { assert } from "@acdh-oeaw/lib";
import type { AssetPrefix } from "@dariah-eric/storage/config";

import { apiBaseUrl } from "../../config/data-migration.config";
import type { WordPressData } from "./get-wordpress-data";
import {
	type AssetsCache,
	type WordPressContentMigrator,
	resolveFullResolutionUrl,
	toPlaintext,
} from "./migrate-wordpress-content";

/**
 * Spotlight articles and impact case studies carry no usable featured image of their own — the
 * image each is known by only exists in the markup of the list page linking to it. This is one such
 * scraped reference: the image, and the article it belongs to.
 */
export interface ListPageImageReference {
	pageSlug: string;
	pageHref: string;
	imageUrl: string;
	mediaId: number | null;
	title: string;
	alt: string | null;
}

export async function uploadListPageImage(
	upload: WordPressContentMigrator["upload"],
	prefix: AssetPrefix,
	assetsCache: AssetsCache,
	media: WordPressData["media"],
	image: ListPageImageReference,
): Promise<string> {
	const wpMedia = image.mediaId != null ? media[image.mediaId] : undefined;
	// The markup this url was scraped from may name a theme-sized derivative rather than the media
	// item itself, which the media library resolves back to its original.
	const url = await resolveFullResolutionUrl(
		new URL(wpMedia?.source_url ?? image.imageUrl, apiBaseUrl),
	);
	const label =
		wpMedia != null ? toPlaintext(wpMedia.title.rendered).trim() : image.title || image.pageSlug;
	const caption = wpMedia != null ? toPlaintext(wpMedia.caption.rendered).trim() : image.title;
	const alt = wpMedia?.alt_text ?? image.alt ?? undefined;
	const asset = await upload(prefix, assetsCache, url, label, caption, alt);

	assert(asset, `Missing list page image asset (${image.pageSlug}).`);

	return asset.id;
}

function decodeHtmlAttribute(value: string): string {
	return value
		.replaceAll("&amp;", "&")
		.replaceAll("&quot;", '"')
		.replaceAll("&#039;", "'")
		.replaceAll("&#8217;", "'");
}

function getHtmlAttribute(html: string, attribute: string): string | null {
	const match = new RegExp(`\\s${attribute}="([^"]*)"`, "i").exec(html);
	return match != null ? decodeHtmlAttribute(match[1]!) : null;
}

function getSlugFromWordPressHref(href: string): string | null {
	try {
		const url = new URL(href, apiBaseUrl);
		const parts = url.pathname.split("/").filter((part) => part.length > 0);
		return parts.at(-1) ?? null;
	} catch {
		return null;
	}
}

/**
 * Reads the article images out of a list page's markup, keyed by the slug of the article each links
 * to. Only figures linking below `expectedPathPrefix` count — the same page also carries navigation
 * and decoration images, which link elsewhere or nowhere.
 */
export function extractListPageImageReferences(
	html: string,
	expectedPathPrefix: string,
): Map<string, ListPageImageReference> {
	const images = new Map<string, ListPageImageReference>();
	const figureRe = /<figure\b[\s\S]*?<\/figure>/gi;
	let figureMatch: RegExpExecArray | null;

	while ((figureMatch = figureRe.exec(html)) !== null) {
		const figureHtml = figureMatch[0];
		const hrefMatches = Array.from(figureHtml.matchAll(/<a\b[^>]*\shref="([^"]*)"[^>]*>/gi));
		const href = hrefMatches
			.map((match) => decodeHtmlAttribute(match[1]!))
			.find((candidate) => {
				try {
					const url = new URL(candidate, apiBaseUrl);
					return url.pathname.startsWith(expectedPathPrefix);
				} catch {
					return false;
				}
			});

		if (href == null) {
			continue;
		}

		const imageMatch = /<img\b[^>]*>/i.exec(figureHtml);
		const imageHtml = imageMatch?.[0];
		if (imageHtml == null) {
			continue;
		}

		const imageUrl = getHtmlAttribute(imageHtml, "src") ?? getHtmlAttribute(imageHtml, "data-src");
		const pageSlug = getSlugFromWordPressHref(href);
		if (imageUrl == null || pageSlug == null || images.has(pageSlug)) {
			continue;
		}

		const mediaIdMatch = /\bwp-image-(\d+)\b/i.exec(imageHtml);
		const captionMatch = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i.exec(figureHtml);
		const title = captionMatch != null ? toPlaintext(captionMatch[1]!).trim() : pageSlug;
		const alt = getHtmlAttribute(imageHtml, "alt");

		images.set(pageSlug, {
			pageSlug,
			pageHref: href,
			imageUrl: String(new URL(imageUrl, apiBaseUrl)),
			mediaId: mediaIdMatch != null ? Number(mediaIdMatch[1]) : null,
			title,
			alt,
		});
	}

	return images;
}
