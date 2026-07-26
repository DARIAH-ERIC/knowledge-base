import { env } from "~/config/env.config";

export {
	type DownloadableAsset,
	getContentDisposition,
	getContentDispositionHeader,
	getDownloadFilename,
} from "@dariah-eric/storage/download";

/**
 * Absolute download url for an asset, by storage key.
 *
 * By key rather than by asset id, because that is what rich-text link targets store: the asset
 * cleanup service finds richtext-embedded assets by scanning `jsonb` for the key, so keeping the
 * key as the reference is what makes an asset linked from prose count as used.
 *
 * The naming and disposition rules this pairs with live in `@dariah-eric/storage/download`, shared
 * with the dashboard; only the url is app-specific, since it needs this API's own base url.
 */
export function getAssetDownloadUrl(key: string): string {
	const path = key
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");

	return new URL(`/api/v1/assets/${path}/download`, env.API_BASE_URL).href;
}
