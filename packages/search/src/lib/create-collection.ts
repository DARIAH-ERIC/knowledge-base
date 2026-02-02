import { resources } from "../schema";
import type { Client } from "./admin-client";

export async function createCollection(client: Client): Promise<boolean> {
	if (await client.collections(resources.name).exists()) {
		return false;
	}

	await client.collections().create(resources.schema);

	return true;
}
