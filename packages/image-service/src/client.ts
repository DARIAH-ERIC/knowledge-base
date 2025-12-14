import type { Readable } from "node:stream";

import { assert } from "@acdh-oeaw/lib";
import type { BucketItem, ItemBucketMetadata } from "minio";

import { env } from "../config/env.config";
import { createMinioClient } from "./create-minio-client";
import { generateObjectName } from "./generate-object-name";
import { generateSignedImageUrl, type ImageUrlOptions } from "./generate-signed-image-url";

const bucketName = env.S3_BUCKET;

interface Client {
	images: {
		get: () => Promise<{ images: Array<{ objectName: string }> }>;
		remove: (objectName: string) => Promise<void>;
		upload: (
			fileName: string,
			fileStream: Readable,
			fileSize: number,
			metadata: ItemBucketMetadata,
		) => Promise<{ objectName: string }>;
	};
	urls: {
		generate: (objectName: string, options: ImageUrlOptions) => { url: string };
	};
}

export function createClient(): Client {
	const client = createMinioClient();

	async function get() {
		const stream = client.listObjectsV2(bucketName);

		const images: Array<{ objectName: string }> = [];

		for await (const bucketItem of stream) {
			const item = bucketItem as BucketItem;
			const objectName = item.name;
			assert(objectName);
			images.push({ objectName });
		}

		return { images };
	}

	async function remove(objectName: string) {
		await client.removeObject(bucketName, objectName);
	}

	async function upload(
		fileName: string,
		fileStream: Readable,
		fileSize: number,
		metadata: ItemBucketMetadata,
	) {
		const objectName = generateObjectName(fileName);

		await client.putObject(bucketName, objectName, fileStream, fileSize, metadata);

		return { objectName };
	}

	function generate(objectName: string, options: ImageUrlOptions) {
		const url = generateSignedImageUrl(bucketName, objectName, options);

		return { url };
	}

	return {
		images: {
			get,
			remove,
			upload,
		},
		urls: {
			generate,
		},
	};
}

export const client = createClient();
