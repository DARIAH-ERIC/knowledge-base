import type { ImageUrlOptions } from "@/lib/images";

export const imageMimeTypes = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/avif",
	"image/svg+xml",
] as const;

export const mediaLibraryPageSize = 20;

/** Must be less than `serverActions.bodySizeLimit` in `next.config.ts`. */
export const imageSizeLimit = 20 * 1024 * 1024; /** 20 MB */

/**
 * Maximum image resolution (total pixels) we accept. Beyond this, imgproxy refuses to render the
 * source image and the asset would be broken.
 *
 * Must match the `IMGPROXY_MAX_SRC_RESOLUTION` setting (in megapixels) of the imgproxy deployment,
 * whose default is 50.
 *
 * @see {@link https://docs.imgproxy.net/configuration/options#IMGPROXY_MAX_SRC_RESOLUTION}
 */
export const imageMaxResolution = 50 * 1_000_000; /** 50 megapixels */

export const imageGridOptions: ImageUrlOptions = {
	enlarge: 1,
	gravity: { type: "no" },
	resizing_type: "fit",
	width: 600,
};

export const imageAssetWidth = {
	avatar: 400,
	featured: 1600,
	preview: 800,
};
