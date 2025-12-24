import { Client } from "minio";

import { env } from "../config/env.config";

export function createMinioClient(): Client {
	const client = new Client({
		accessKey: env.S3_ACCESS_KEY,
		endPoint: env.S3_HOST,
		port: env.S3_PORT,
		secretKey: env.S3_SECRET_KEY,
		useSSL: env.S3_PROTOCOL === "https",
	});

	return client;
}
