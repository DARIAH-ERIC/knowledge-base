import type { Readable } from "node:stream";

import { assert } from "@acdh-oeaw/lib";
import type { BucketItem, ItemBucketMetadata } from "minio";

import { env } from "../config/env.config";
import { createMinioClient } from "./create-minio-client";
import { generateObjectName } from "./generate-object-name";

const bucketName = env.S3_BUCKET;

interface Client {
	create: (
		fileName: string,
		fileStream: Readable,
		fileSize: number,
		metadata: ItemBucketMetadata,
	) => Promise<{ objectName: string }>;
	get: () => Promise<{ images: Array<{ objectName: string }> }>;
}

export function createClient(): Client {
	const client = createMinioClient();

	async function create(
		fileName: string,
		fileStream: Readable,
		fileSize: number,
		metadata: ItemBucketMetadata,
	) {
		const objectName = generateObjectName(fileName);

		await client.putObject(bucketName, objectName, fileStream, fileSize, metadata);

		return { objectName };
	}

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

	return {
		create,
		get,
	};
}
