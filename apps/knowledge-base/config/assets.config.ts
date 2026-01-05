import type { ImageUrlOptions } from "@dariah-eric/dariah-knowledge-base-image-service/client";

export const imageMimeTypes = ["image/jpeg", "image/png"] as const;

export const imageSizeLimit = 4 * 1024 * 1024; /** 4 MB */

export const imageGridOptions: ImageUrlOptions = {
	enlarge: 1,
	gravity: { type: "no" },
	resizing_type: "fit",
	width: 400,
};
