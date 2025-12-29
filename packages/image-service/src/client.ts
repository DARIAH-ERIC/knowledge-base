import type { Readable } from "node:stream";

import { assert } from "@acdh-oeaw/lib";
import type { BucketItem, ItemBucketMetadata } from "minio";

import { env } from "../config/env.config";
import { createMinioClient } from "./create-minio-client";
import { generateObjectName } from "./generate-object-name";
import { generateSignedImageUrl, type ImageUrlOptions } from "./generate-signed-image-url";

const bucketName = env.S3_BUCKET;

interface Client {
	bucket: {
		create: () => Promise<void>;
		exists: () => Promise<boolean>;
	};
	images: {
		get: () => Promise<{ images: Array<{ objectName: string }> }>;
		remove: (objectName: string) => Promise<void>;
		upload: (
			fileName: string,
			fileStream: Readable,
			fileSize?: number,
			metadata?: ItemBucketMetadata,
		) => Promise<{ objectName: string }>;
	};
	urls: {
		generate: (objectName: string, options: ImageUrlOptions) => { url: string };
	};
}

export function createClient(): Client {
	const client = createMinioClient();

	const bucket = {
		async create() {
			return client.makeBucket(bucketName);
		},
		async exists() {
			return client.bucketExists(bucketName);
		},
	};

	const images = {
		async get() {
			const stream = client.listObjectsV2(bucketName);

			const images: Array<{ objectName: string }> = [];

			for await (const bucketItem of stream) {
				const item = bucketItem as BucketItem;
				const objectName = item.name;
				assert(objectName);
				images.push({ objectName });
			}

			return { images };
		},
		async remove(objectName: string) {
			await client.removeObject(bucketName, objectName);
		},
		async upload(
			fileName: string,
			fileStream: Readable,
			fileSize?: number,
			metadata?: ItemBucketMetadata,
		) {
			const objectName = generateObjectName(fileName);

			await client.putObject(bucketName, objectName, fileStream, fileSize, metadata);

			return { objectName };
		},
	};

	const urls = {
		generate(objectName: string, options: ImageUrlOptions) {
			const url = generateSignedImageUrl(bucketName, objectName, options);

			return { url };
		},
	};

	return {
		bucket,
		images,
		urls,
	};
}

export const client = createClient();
