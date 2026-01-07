import { S3Client } from "@aws-sdk/client-s3";

import { env } from "../config/env.config";

export type { S3Client };

export function createS3Client(): S3Client {
	const client = new S3Client({
		credentials: {
			accessKeyId: env.S3_ACCESS_KEY,
			secretAccessKey: env.S3_SECRET_KEY,
		},
		region: "auto",
		endpoint: env.S3_HOST,
		forcePathStyle: true,
		// port: env.S3_PORT,
		// useSSL: env.S3_PROTOCOL === "https",
	});

	return client;
}

export const s3client = createS3Client();
