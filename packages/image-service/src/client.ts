import type { Readable } from "node:stream";

import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";

import { env } from "../config/env.config";
import { generateObjectKey } from "./generate-object-key";
import { generateSignedImageUrl, type ImageUrlOptions } from "./generate-signed-image-url";
import type { AssetMetadata } from "./get-image-metadata";
import { s3client } from "./s3-client";

const bucketName = env.S3_BUCKET_NAME;

export type { ImageUrlOptions };

export interface Client {
	bucket: {
		name: string;
	};
	images: {
		// get: () => Promise<{ images: Array<{ key: string }> }>;
		remove: (key: string) => Promise<void>;
		upload: (
			prefix: string,
			fileName: string,
			fileStream: Readable,
			fileSize?: number,
			metadata?: AssetMetadata,
		) => Promise<{ key: string }>;
	};
	urls: {
		generate: (key: string, options: ImageUrlOptions) => { url: string };
	};
}

export function createClient(): Client {
	const images = {
		// async get() {
		// 	const command = new ListObjectsV2Command({ Bucket: bucketName })

		// 	const stream = s3client.send(command);

		// 	const images: Array<{ key: string }> = [];

		// 	for await (const bucketItem of stream) {
		// 		const item = bucketItem as BucketItem;
		// 		const key = item.name;
		// 		assert(key);
		// 		images.push({ key });
		// 	}

		// 	return { images };
		// },
		async remove(key: string) {
			const command = new DeleteObjectCommand({ Bucket: bucketName, Key: key });

			await s3client.send(command);
		},
		async upload(prefix: string, fileName: string, fileStream: Readable, metadata?: AssetMetadata) {
			const key = generateObjectKey(prefix, fileName);

			const command = new PutObjectCommand({
				Bucket: bucketName,
				Key: key,
				Body: fileStream,
				ContentType: metadata?.["content-type"],
			});

			await s3client.send(command);

			return { key };
		},
	};

	const urls = {
		generate(key: string, options: ImageUrlOptions) {
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
