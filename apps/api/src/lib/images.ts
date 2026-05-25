import { images } from "@/services/images";

export function generateImageUrl(image: { key: string }, width: number): { url: string };
export function generateImageUrl(
	image: { key: string } | null | undefined,
	width: number,
): { url: string } | null;
export function generateImageUrl(
	image: { key: string } | null | undefined,
	width: number,
): { url: string } | null {
	if (image == null) {
		return null;
	}
	return images.generateSignedImageUrl({ key: image.key, options: { width } });
}
