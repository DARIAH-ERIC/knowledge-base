import { log } from "@acdh-oeaw/lib";

import { client } from "../src/lib/admin-client";
import { createBucket } from "../src/lib/create-bucket";

const bucketName = client.bucket.name;

async function main() {
	const isCreated = await createBucket(client);

	if (isCreated) {
		log.success(`Successfully created "${bucketName}" bucket in object store.`);
	} else {
		log.success(`Bucket "${bucketName}" already exists in object store.`);
	}
}

main().catch((error: unknown) => {
	log.error(`Failed to create "${bucketName}" bucket in object store.\n`, error);
	process.exitCode = 1;
});
