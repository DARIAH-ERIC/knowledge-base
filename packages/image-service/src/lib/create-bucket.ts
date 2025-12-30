import type { Client } from "./admin-client";

export async function createBucket(client: Client): Promise<boolean> {
	if (await client.bucket.exists()) {
		return false;
	}

	await client.bucket.create();

	return true;
}
