import { assert } from "@acdh-oeaw/lib";
import { type BucketItem, Client as MinioClient } from "minio";

import { env } from "../../config/env.config";
import { createStorageService } from "..";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createClient() {
	const accessKey = env.S3_ACCESS_KEY;
	const bucketName = env.S3_BUCKET_NAME;
	const endPoint = env.S3_HOST;
	const port = env.S3_PORT;
	const secretKey = env.S3_SECRET_KEY;
	const useSSL = env.S3_PROTOCOL === "https";

	const minio = new MinioClient({
		accessKey,
		endPoint,
		port,
		secretKey,
		useSSL,
	});

	const _client = createStorageService({
		config: {
			accessKey,
			bucketName,
			endPoint,
			port,
			secretKey,
			useSSL,
		},
	});

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

export type Client = ReturnType<typeof createClient>;
