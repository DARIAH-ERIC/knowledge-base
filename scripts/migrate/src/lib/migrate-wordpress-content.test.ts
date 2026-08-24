import type { Extensions, JSONContent } from "@tiptap/core";
import { generateJSON } from "@tiptap/html";
import { describe, expect, it } from "vitest";

import {
	type WordPressOriginal,
	indexWordPressDerivatives,
	toFullResolutionUrl,
	wordPressParseExtensions,
} from "./migrate-wordpress-content";

/** A Gutenberg table block: no `<thead>`, two columns of label/value pairs. */
const wordPressTable = `<figure class="wp-block-table"><table><tbody><tr><td>Post Status&nbsp;</td><td>Fixed-term contract</td></tr><tr><td>Location</td><td>Remote in Germany or France.</td></tr></tbody></table></figure>`;

function parse(html: string, extensions: Extensions): JSONContent {
	return generateJSON(html, extensions) as JSONContent;
}

/** Node types of a node's direct children, so a parse can be asserted shape-first. */
function childTypes(node: JSONContent | undefined): Array<string | undefined> {
	return (node?.content ?? []).map((child) => child.type);
}

describe("wordPressParseExtensions", () => {
	it("parses a WordPress table into table nodes rather than flattening it", () => {
		const doc = parse(wordPressTable, wordPressParseExtensions);

		expect(childTypes(doc)).toStrictEqual(["table"]);

		const table = doc.content?.[0];
		expect(childTypes(table)).toStrictEqual(["tableRow", "tableRow"]);
		expect(childTypes(table?.content?.[0])).toStrictEqual(["tableCell", "tableCell"]);
	});

	it("reads `th` cells as header cells", () => {
		const doc = parse(
			"<table><tbody><tr><th>Term</th><td>Definition</td></tr></tbody></table>",
			wordPressParseExtensions,
		);

		expect(childTypes(doc.content?.[0]?.content?.[0])).toStrictEqual(["tableHeader", "tableCell"]);
	});

	/**
	 * The regression this guards: an extension set without table node types does not error on
	 * `<table>` markup, it silently unwraps it — every cell's text run together in one paragraph.
	 * That is what the original migration produced, and why tables had to be backfilled.
	 */
	it("would flatten the same markup into one paragraph without the table extensions", () => {
		const doc = parse(
			wordPressTable,
			wordPressParseExtensions.filter((extension) => extension.name !== "tableKit"),
		);

		expect(childTypes(doc)).toStrictEqual(["paragraph"]);
	});
});

/** One media item as `/wp/v2/media` delivers it: a 1890×1890 original and two of its sizes. */
const mediaItem = {
	id: 42,
	source_url: "https://www.dariah.eu/wp-content/uploads/2026/05/qr-code.png",
	media_details: {
		width: 1890,
		height: 1890,
		sizes: {
			medium: {
				source_url: "https://www.dariah.eu/wp-content/uploads/2026/05/qr-code-612x612.png",
				width: 612,
				height: 612,
			},
			full: {
				source_url: "https://www.dariah.eu/wp-content/uploads/2026/05/qr-code.png",
				width: 1890,
				height: 1890,
			},
		},
	},
};

/** A landscape original whose `thumbnail` size is a square cut out of the frame, not a downscale. */
const croppedMediaItem = {
	id: 43,
	source_url: "https://www.dariah.eu/wp-content/uploads/2026/04/atrium.jpg",
	media_details: {
		width: 1200,
		height: 675,
		sizes: {
			thumbnail: {
				source_url: "https://www.dariah.eu/wp-content/uploads/2026/04/atrium-150x150.jpg",
				width: 150,
				height: 150,
			},
			medium: {
				source_url: "https://www.dariah.eu/wp-content/uploads/2026/04/atrium-612x344.jpg",
				width: 612,
				height: 344,
			},
		},
	},
};

function resolve(index: Map<string, WordPressOriginal | null>, href: string): string {
	return toFullResolutionUrl(new URL(href), index.get(normalise(href))).href;
}

/** Mirrors the module's own url normalisation, which is not exported. */
function normalise(href: string): string {
	const url = new URL(href);

	return `${url.host.replace(/^www\./, "")}${decodeURIComponent(url.pathname)}`;
}

describe("indexWordPressDerivatives", () => {
	it("maps every derivative url to the original it was cut from", () => {
		const index = indexWordPressDerivatives([mediaItem]);

		expect(index.get(normalise(mediaItem.media_details.sizes.medium.source_url))).toMatchObject({
			mediaId: 42,
			derivative: { width: 612, height: 612 },
			full: { width: 1890, height: 1890 },
			fullUrl: mediaItem.source_url,
		});
	});

	it("maps a url two media items both claim to null, as unresolvable", () => {
		const other = { ...croppedMediaItem, id: 44 };
		const index = indexWordPressDerivatives([croppedMediaItem, other]);

		expect(index.get(normalise(croppedMediaItem.media_details.sizes.medium.source_url))).toBeNull();
	});

	it("skips media items whose details carry no dimensions", () => {
		expect(
			indexWordPressDerivatives([{ id: 45, source_url: "https://example.com/a.png" }]).size,
		).toBe(0);
	});
});

describe("toFullResolutionUrl", () => {
	it("swaps a downscaled derivative for its original", () => {
		const index = indexWordPressDerivatives([mediaItem]);

		expect(
			resolve(index, "https://www.dariah.eu/wp-content/uploads/2026/05/qr-code-612x612.png"),
		).toBe(mediaItem.source_url);
	});

	it("keeps a hard-cropped derivative, which shows something else than its original", () => {
		const index = indexWordPressDerivatives([croppedMediaItem]);
		const cropped = "https://www.dariah.eu/wp-content/uploads/2026/04/atrium-150x150.jpg";

		expect(resolve(index, cropped)).toBe(cropped);
	});

	it("keeps a derivative that is the full size registered under a size name", () => {
		const index = indexWordPressDerivatives([mediaItem]);

		expect(resolve(index, mediaItem.source_url)).toBe(mediaItem.source_url);
	});

	it("keeps a url no media item knows about", () => {
		const unknown = "https://www.dariah.eu/wp-content/uploads/2026/05/elsewhere-612x612.png";

		expect(resolve(indexWordPressDerivatives([mediaItem]), unknown)).toBe(unknown);
	});

	it("matches urls that differ only in `www.` or percent-encoding", () => {
		const index = indexWordPressDerivatives([
			{
				...mediaItem,
				media_details: {
					...mediaItem.media_details,
					sizes: {
						medium: {
							source_url: "https://www.dariah.eu/wp-content/uploads/2026/05/día-612x612.png",
							width: 612,
							height: 612,
						},
					},
				},
			},
		]);

		expect(
			resolve(index, "https://dariah.eu/wp-content/uploads/2026/05/d%C3%ADa-612x612.png"),
		).toBe(mediaItem.source_url);
	});
});
