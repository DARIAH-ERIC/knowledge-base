export const assetPrefixes = ["avatars", "documents", "images", "logos"] as const;

export type AssetPrefix = (typeof assetPrefixes)[number];

export const imageMimeTypes = ["image/jpeg", "image/png"] as const;

export const imageSizeLimit = 4 * 1024 * 1024; /** 4 MB */
