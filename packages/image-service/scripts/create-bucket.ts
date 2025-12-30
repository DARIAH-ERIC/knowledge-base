import { log } from "@acdh-oeaw/lib";

import { env } from "../config/env.config";
import { client } from "../src/admin-client";

const bucketName = env.S3_BUCKET;

async function main() {
	if (!(await client.bucket.exists())) {
		await client.bucket.create();
	}

	log.success(`Successfully created "${bucketName}" bucket in object store.`);
}

main().catch((error: unknown) => {
	log.error(`Failed to create "${bucketName}" bucket in object store.\n`, error);
	process.exitCode = 1;
});
