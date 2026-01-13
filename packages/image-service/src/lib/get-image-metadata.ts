import sharp, { type Metadata } from "sharp";
import { Readable } from "node:stream";

export async function getImageMetadata(stream: Readable) {
	const metadata = await stream.pipe(sharp()).metadata();

	const { format, height, orientation, size, width } = metadata;

	return {
		/** Used in minio web ui. */
		"content-type": `image/${format}`,
		format,
		height,
		orientation,
		size,
		width,
	};
}
