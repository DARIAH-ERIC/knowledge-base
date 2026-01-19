/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import {
	type AssetPrefix,
	assetPrefixes,
	client,
	type ImageUrlOptions,
} from "@dariah-eric/dariah-knowledge-base-image-service/client";

export { assetPrefixes };

interface GetAssetsParams {
	imageUrlOptions: ImageUrlOptions;
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getAssets(params: GetAssetsParams) {
	const { imageUrlOptions, limit = 10, offset = 0 } = params;

	const [assets, total] = await Promise.all([
		db.query.assets.findMany({
			columns: {
				key: true,
			},
			limit,
			offset,
			orderBy: {
				updatedAt: "desc",
			},
		}),
		db.$count(schema.assets),
	]);

	const urls = assets.map((asset) => {
		const { url } = client.urls.generateSignedImageUrl({
			key: asset.key,
			options: imageUrlOptions,
		});

		return url;
	});

	return {
		urls,
		total,
	};
}

interface UploadAssetParams {
	file: File;
	licenseId?: string;
	prefix: AssetPrefix;
}

export async function uploadAsset(params: UploadAssetParams) {
	const { file, licenseId, prefix } = params;

	const input = Readable.fromWeb(file.stream() as ReadableStream);
	const size = file.size;
	const metadata = { "content-type": file.type, name: file.name };

	const { key } = await client.images.upload({ input, prefix, metadata, size });

	await db.insert(schema.assets).values({ key, licenseId });

	return {
		key,
	};
}

interface GetPresignedUploadUrlParams {
	prefix: AssetPrefix;
}

export async function getPresignedUploadUrl(params: GetPresignedUploadUrlParams) {
	const { prefix } = params;

	const { key, url } = await client.urls.generatePresignedUploadUrl({ prefix });

	return {
		key,
		url,
	};
}
