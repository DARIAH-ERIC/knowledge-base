/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

import {
	client,
	type ImageUrlOptions,
} from "@dariah-eric/dariah-knowledge-base-image-service/client";

export async function getAssets(options: ImageUrlOptions) {
	const { images } = await client.images.get();

	const urls = images.map((image) => {
		const { url } = client.urls.generate({ key: image.key, options });

		return url;
	});

	return urls;
}

interface UploadAssetParams {
	file: File;
}

export async function uploadAsset(params: UploadAssetParams) {
	const { file } = params;

	const input = Readable.fromWeb(file.stream() as ReadableStream);
	const size = file.size;
	const metadata = { "content-type": file.type, name: file.name };

	const data = await client.images.upload({ prefix: "images", input, size, metadata });

	return data;
}
