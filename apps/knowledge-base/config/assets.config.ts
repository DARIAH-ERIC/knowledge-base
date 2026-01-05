import type { ImageUrlOptions } from "@dariah-eric/dariah-knowledge-base-image-service/client";

export const imageMimeTypes = ["image/jpeg", "image/png"] as const;

/** This must be smaller than the allowed `serverActions.bodySizeLimit` in `next.config.ts`. */
export const imageSizeLimit = 2 * 1024 * 1024; /** 2mb */

export const imageGridOptions: ImageUrlOptions = {
	enlarge: 1,
	gravity: { type: "no" },
	resizing_type: "fit",
	width: 400,
};
