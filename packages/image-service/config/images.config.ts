export const assetPrefixes = ["avatars", "images"] as const;

export const imageMimeTypes = ["image/jpeg", "image/png"] as const;

export const imageSizeLimit = 4 * 1024 * 1024; /** 4 MB */

export const presignedUrlExpirySeconds = 60 * 5; /** 5 minutes */
