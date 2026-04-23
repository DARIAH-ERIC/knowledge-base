import type { Readable } from "node:stream";

import { type BucketItem, Client, type ItemBucketMetadata } from "minio";

import { type AssetPrefix, presignedUrlExpirySeconds } from "../config/images.config";
import { generateObjectKey } from "./generate-object-key";

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

	const objects = {
		async get(params: { key: string }) {
			return minio.getObject(bucketName, params.key);
		},
		async copy(params: {
			source: {
				bucket: string;
				key: string;
			};
			prefix: string;
		}) {
			const { source, prefix } = params;
			const key = `${prefix}/${source.key}`;
			await minio.copyObject(bucketName, key, `/${source.bucket}/${source.key}`);
			const stat = await minio.statObject(bucketName, key);
			const meta = stat.metaData as Record<string, string>;
			const metadata: AssetMetadata = {
				...stat.metaData,
				"content-type": meta["content-type"] ?? "application/octet-stream",
			};
			return { key, metadata };
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
		objects,
		urls,
	};
}

export type StorageService = ReturnType<typeof createStorageService>;
