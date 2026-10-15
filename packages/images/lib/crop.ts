/**
 * Crop geometry shared by the api, which asks imgproxy for the crops, and the knowledge base, which
 * previews them. A separate entry point from the imgproxy url signing, so that a client component
 * can import it without pulling in node-only code.
 */

/**
 * The aspect ratios the variant endpoint will crop to, as `width / height`.
 *
 * Deliberately a small set the layouts snap to, rather than one entry per slot. The consuming
 * website currently renders ten distinct ratios, all of them arrived at by fitting a box and
 * letting `object-cover` absorb the difference — reproducing that here would move the same
 * arbitrariness onto the server and multiply the cache surface for no gain.
 *
 * Omitting the ratio is a first-class mode, not a fallback: it scales to width and does not crop,
 * which is what a letterboxed slot (`object-contain`) and a "view full size" link both need.
 */
export const imageVariantAspectRatios = {
	"1x1": 1,
	"3x2": 3 / 2,
	"16x9": 16 / 9,
	/** The banner ratio the wide card and hero slots (~2.15–2.23) snap to. */
	"21x9": 21 / 9,
} as const;

export type ImageVariantAspectRatio = keyof typeof imageVariantAspectRatios;

/** The part of a source image a crop keeps, as fractions of the source width and height. */
export interface CropFrame {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * The part of an image a `fill` crop to `cropAspectRatio` keeps, the way imgproxy cuts it with
 * `gravity: fp`: scaled to cover, then centred on the focal point and pushed back inside the image
 * where centring would overrun an edge. Without a point it centres, like `gravity: ce`.
 *
 * This is not what css `object-position: x% y%` does — that aligns the point x% across the source
 * with the point x% across the slot, so it only agrees with imgproxy at the centre and the edges. A
 * preview built on `object-position` shows editors a crop the website never receives.
 */
export function getCropFrame(params: {
	cropAspectRatio: number;
	focalPoint?: { x: number; y: number } | null;
	imageAspectRatio: number;
}): CropFrame {
	const { cropAspectRatio, focalPoint, imageAspectRatio } = params;
	const point = focalPoint ?? { x: 0.5, y: 0.5 };

	/** A crop wider than the image keeps its full width; a narrower one keeps its full height. */
	const width = Math.min(1, cropAspectRatio / imageAspectRatio);
	const height = Math.min(1, imageAspectRatio / cropAspectRatio);

	function place(centre: number, size: number): number {
		return Math.min(Math.max(centre - size / 2, 0), 1 - size);
	}

	return { x: place(point.x, width), y: place(point.y, height), width, height };
}
