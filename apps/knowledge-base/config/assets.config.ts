import type { ImageUrlOptions } from "@/lib/images";

export const imageMimeTypes = ["image/jpeg", "image/png"] as const;

export const mediaLibraryPageSize = 20;

export const imageSizeLimit = 4 * 1024 * 1024; /** 4 MB */

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
