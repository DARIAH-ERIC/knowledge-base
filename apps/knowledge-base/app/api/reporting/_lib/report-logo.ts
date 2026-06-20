import { images } from "@/lib/images";

/**
 * Fetches a report's branding logo as PNG bytes for embedding in a PDF. The asset is rasterized to
 * PNG by imgproxy (so SVG logos work too) and capped in width. Returns `null` when there is no logo
 * key or the fetch fails, so the caller can fall back to rendering the unit name as text instead of
 * failing the whole document.
 */
export async function fetchBrandLogo(imageKey: string | null): Promise<Buffer | null> {
	if (imageKey == null) {
		return null;
	}

	try {
		const { url } = images.generateSignedImageUrl({
			key: imageKey,
			options: { width: 240, enlarge: false, format: "png" },
		});

		const response = await fetch(url);
		if (!response.ok) {
			return null;
		}

		return Buffer.from(await response.arrayBuffer());
	} catch {
		return null;
	}
}
