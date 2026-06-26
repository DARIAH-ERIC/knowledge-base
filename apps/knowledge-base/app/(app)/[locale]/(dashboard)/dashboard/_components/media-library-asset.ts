export interface MediaLibraryAsset {
	key: string;
	label: string;
	mimeType?: string;
	url: string;
	// Richer metadata, provided by `getMediaLibraryAssets` / `GET /api/assets`.
	// Optional so callers that forward a minimal `{ key, label, url }` shape stay
	// assignable; the fields are populated at runtime for the media library list view.
	id?: string;
	alt?: string | null;
	caption?: string | null;
	licenseId?: string | null;
	size?: number | null;
}
