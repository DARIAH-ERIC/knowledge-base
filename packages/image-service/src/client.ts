import type { Readable } from "node:stream";

import type { BucketItem, ItemBucketMetadata } from "minio";

import { env } from "../config/env.config";
import { assetPrefixes, presignedUrlExpirySeconds } from "../config/images.config";
import { generateObjectKey } from "./generate-object-key";
import { generateSignedImageUrl, type ImageUrlOptions } from "./generate-signed-image-url";
import { client as minio } from "./minio-client";

const bucketName = env.S3_BUCKET_NAME;

export { assetPrefixes };

export type AssetPrefix = (typeof assetPrefixes)[number];

export type { ImageUrlOptions };

export interface AssetMetadata extends ItemBucketMetadata {
	"content-type": string;
}

export interface Client {
	bucket: {
		name: string;
	};
	images: {
		get: (prefix?: AssetPrefix) => Promise<{ images: Array<{ key: string }> }>;
		remove: (params: { key: string }) => Promise<void>;
		upload: (params: {
			input: Readable | Buffer;
			metadata: AssetMetadata;
			prefix: AssetPrefix;
			size?: number;
		}) => Promise<{ key: string }>;
	};
	urls: {
		generatePresignedUploadUrl: (params: {
			prefix: AssetPrefix;
		}) => Promise<{ key: string; url: string }>;
		generateSignedImageUrl: (params: { key: string; options: ImageUrlOptions }) => { url: string };
	};
}

export function createClient(): Client {
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
		generateSignedImageUrl(params: { key: string; options: ImageUrlOptions }) {
			const { key, options } = params;

			const url = generateSignedImageUrl(bucketName, key, options);

			return { url };
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

export const client = createClient();
