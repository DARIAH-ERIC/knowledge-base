import { resources } from "../schema";
import type { Client } from "./admin-client";

export async function reset(client: Client): Promise<void> {
	await client.collections(resources.name).documents().delete({ truncate: true });
}
