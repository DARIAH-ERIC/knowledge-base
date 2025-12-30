import { env } from "../config/env.config";
import { client as _client } from "./client";
import { client as minio } from "./minio-client";

const bucketName = env.S3_BUCKET;

type _Client = typeof _client;

export interface Client extends _Client {
	bucket: {
		create: () => Promise<void>;
		exists: () => Promise<boolean>;
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
		async reset() {
			await minio.removeBucket(bucketName);
			return minio.makeBucket(bucketName);
		},
	};

	return {
		..._client,
		bucket,
	};
}

export const client = createClient();
