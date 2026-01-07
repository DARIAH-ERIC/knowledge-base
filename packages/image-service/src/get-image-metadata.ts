import type { Readable } from "node:stream";

import sharp from "sharp";

export interface AssetMetadata {
	"content-type": string;
	height: number;
	orientation?: number;
	size?: number;
	width: number;
}

export async function getImageMetadata(inputStream: Readable): Promise<AssetMetadata> {
	const imageStream = inputStream.pipe(sharp());

	const { format, height, orientation, size, width } = await imageStream.metadata();

	return {
		"content-type": `image/${format}`,
		height,
		orientation,
		size,
		width,
	};
}
