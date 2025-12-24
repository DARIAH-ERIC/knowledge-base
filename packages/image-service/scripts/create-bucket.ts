import { log } from "@acdh-oeaw/lib";

import { env } from "../config/env.config";
import { createMinioClient } from "../src/create-minio-client";

const bucketName = env.S3_BUCKET;

async function main() {
	const client = createMinioClient();

	if (!(await client.bucketExists(bucketName))) {
		await client.makeBucket(bucketName);
	}

	log.success(`Successfully created "${bucketName}" bucket in object store.`);
}

main().catch((error: unknown) => {
	log.error(`Failed to create "${bucketName}" bucket in object store.\n`, error);
	process.exitCode = 1;
});
