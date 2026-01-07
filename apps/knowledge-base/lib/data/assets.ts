/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import {
	client,
	type ImageUrlOptions,
} from "@dariah-eric/dariah-knowledge-base-image-service/client";

interface GetAssetsParams {
	imageUrlOptions: ImageUrlOptions;
	limit: number;
	offset: number;
}

export async function getAssets(params: GetAssetsParams) {
	const { limit, offset, imageUrlOptions } = params;

	const assets = await db.query.assets.findMany({
		orderBy: {
			updatedAt: "desc",
		},
		limit,
		offset,
	});

	const urls = assets.map((asset) => {
		const { url } = client.urls.generate(asset.key, imageUrlOptions);

		return url;
	});

	return urls;
}

interface UploadAssetParams {
	file: File;
}

// FIXME: currently, the whole image upload is proxied through the nextjs server.
// it would be better to create a presigned url and let the client upload directly to s3.
// FIXME: need to store the asset in the db
export async function uploadAsset(params: UploadAssetParams) {
	const { file } = params;

	const fileName = file.name;
	const fileStream = Readable.fromWeb(file.stream() as ReadableStream);
	const fileSize = file.size;
	const metadata = { "content-type": file.type };

	const data = await client.images.upload(fileName, fileStream, fileSize, metadata);

	return data;
}
