import type { Collection } from "../create-collection";
import type { Client } from "./admin-client";

export async function createCollection(
	client: Client,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	collection: Collection<any, any, any, any>,
): Promise<boolean> {
	if (await client.collections(collection.name).exists()) {
		return false;
	}

	await client.collections().create(collection.schema);

	return true;
}
