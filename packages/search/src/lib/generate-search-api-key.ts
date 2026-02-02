import { resources } from "../schema";
import type { Client } from "./admin-client";

export async function generateSearchApiKey(client: Client): Promise<string> {
	const response = await client.keys().create({
		actions: ["documents:export", "documents:get", "documents:search"],
		collections: [resources.name],
		description: `Search-only api key for "${resources.name}".`,
	});

	return response.value!;
}
