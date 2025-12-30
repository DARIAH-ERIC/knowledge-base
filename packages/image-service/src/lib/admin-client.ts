import { assert } from "@acdh-oeaw/lib";
import type { BucketItem } from "minio";

import { env } from "../../config/env.config";
import { client as _client } from "../client";
import { client as minio } from "../minio-client";

const bucketName = env.S3_BUCKET_NAME;

type _Client = typeof _client;

export interface Client extends Omit<_Client, "bucket"> {
	bucket: {
		create: () => Promise<void>;
		exists: () => Promise<boolean>;
		name: string;
		reset: () => Promise<void>;
	};
}

export function createClient(): Client {
	const bucket = {
		async create() {
			return minio.makeBucket(bucketName);
		},
		async exists() {
			return minio.bucketExists(bucketName);
		},
		name: bucketName,
		async reset() {
			const items: Array<string> = [];

			const stream = minio.listObjectsV2(bucketName, "", true);

			for await (const item of stream) {
				const { name } = item as BucketItem;
				assert(name, "Bucket item is missing name.");
				items.push(name);
			}

			if (items.length > 0) {
				await minio.removeObjects(bucketName, items);
			}
		},
	};

	return {
		..._client,
		bucket,
	};
}

export const client = createClient();
