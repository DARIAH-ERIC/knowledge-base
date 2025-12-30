import type { Client } from "./admin-client";

export async function reset(client: Client): Promise<void> {
	await client.bucket.reset();
}
