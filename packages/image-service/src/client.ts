import type { Readable } from "node:stream";

import { assert } from "@acdh-oeaw/lib";
import type { BucketItem, ItemBucketMetadata } from "minio";

import { env } from "../config/env.config";
import { generateObjectName } from "./generate-object-name";
import { generateSignedImageUrl, type ImageUrlOptions } from "./generate-signed-image-url";
import { client as minio } from "./minio-client";

const bucketName = env.S3_BUCKET;

export interface Client {
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
	const images = {
		async get() {
			const stream = minio.listObjectsV2(bucketName);

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
			await minio.removeObject(bucketName, objectName);
		},
		async upload(
			fileName: string,
			fileStream: Readable,
			fileSize?: number,
			metadata?: ItemBucketMetadata,
		) {
			const objectName = generateObjectName(fileName);

			await minio.putObject(bucketName, objectName, fileStream, fileSize, metadata);

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
		images,
		urls,
	};
}

export const client = createClient();
