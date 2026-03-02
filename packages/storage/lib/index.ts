import type { Readable } from "node:stream";

import { type BucketItem, Client, type ItemBucketMetadata } from "minio";

import { assetPrefixes, presignedUrlExpirySeconds } from "../config/images.config";
import { generateObjectKey } from "./generate-object-key";

export { assetPrefixes };

export type AssetPrefix = (typeof assetPrefixes)[number];

export interface AssetMetadata extends ItemBucketMetadata {
	"content-type": string;
}

export interface CreateStorageServiceParams {
	config: {
		accessKey: string;
		bucketName: string;
		endPoint: string;
		port: number;
		secretKey: string;
		useSSL: boolean;
	};
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createStorageService(params: CreateStorageServiceParams) {
	const { accessKey, bucketName, endPoint, port, secretKey, useSSL } = params.config;

	const minio = new Client({
		accessKey,
		endPoint,
		port,
		secretKey,
		useSSL,
	});

	const images = {
		async get(prefix?: AssetPrefix) {
			// TODO: `@aws-sdk/client-s3` has `max_keys` option and `listObjectsV2WithMetadata` method.
			const stream = minio.listObjectsV2(bucketName, prefix, true);

			const images: Array<{ key: string }> = [];

			for await (const _item of stream) {
				const item = _item as BucketItem;

				/** Always defined because we query `listObjectsV2` with `recursive: true`.  */
				const key = item.name!;

				images.push({ key });
			}

			return { images };
		},
		async remove(params: { key: string }) {
			const { key } = params;

			await minio.removeObject(bucketName, key);
		},
		async upload(params: {
			input: Readable | Buffer;
			metadata: AssetMetadata;
			prefix: AssetPrefix;
			size?: number;
		}) {
			const { input, metadata, prefix, size } = params;

			const key = generateObjectKey(prefix);

			await minio.putObject(bucketName, key, input, size, metadata);

			return { key };
		},
	};

	const urls = {
		async generatePresignedUploadUrl(params: { prefix: AssetPrefix }) {
			const { prefix } = params;

			const key = generateObjectKey(prefix);

			const url = await minio.presignedPutObject(bucketName, key, presignedUrlExpirySeconds);

			return { key, url };
		},
	};

	return {
		bucket: {
			name: bucketName,
		},
		images,
		urls,
	};
}

export type StorageService = ReturnType<typeof createStorageService>;
