/**
 * The first segment of every storage key, which doubles as the asset's kind: crops and the website
 * read it off the key. An asset therefore cannot move between prefixes, since its key is embedded
 * in rich-text content and in public urls cached as immutable. Should moving ever be needed, give
 * `assets` a `kind` column to read instead, keep existing keys as they are, and mint neutral keys
 * for new uploads, rather than renaming objects.
 */
export const assetPrefixes = ["avatars", "documents", "images", "logos"] as const;

export type AssetPrefix = (typeof assetPrefixes)[number];
