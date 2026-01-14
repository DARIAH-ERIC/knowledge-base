/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

// import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
// import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import {
	client,
	type ImageUrlOptions,
} from "@dariah-eric/dariah-knowledge-base-image-service/client";

// FIXME: query assets table, not object store
// FIXME: pagination

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

// FIXME: use presigned url to allow client to upload directly to object store
// (also avoids increasing body size limit in next.config.ts)

export async function uploadAsset(params: UploadAssetParams) {
	const { file } = params;

	const input = Readable.fromWeb(file.stream() as ReadableStream);
	const size = file.size;
	const metadata = { "content-type": file.type, name: file.name };

	const data = await client.images.upload({ prefix: "images", input, size, metadata });

	return data;
}
