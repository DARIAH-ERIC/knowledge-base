import { assert } from "@acdh-oeaw/lib";
import { Client } from "typesense";

import { env } from "../config/env.config";
import { cacheSearchResultsForSeconds } from "../config/search.config";

export type { Client };

export interface SearchClientConfig {
	host: string;
	port: number;
	protocol: "http" | "https";
	apiKey: string;
	cacheSearchResultsForSeconds?: number;
}

export function createSearchClient(config: SearchClientConfig): Client {
	return new Client({
		apiKey: config.apiKey,
		cacheSearchResultsForSeconds: config.cacheSearchResultsForSeconds,
		connectionTimeoutSeconds: 3,
		nodes: [
			{
				host: config.host,
				port: config.port,
				protocol: config.protocol,
			},
		],
	});
}

export function createClient(): Client {
	const apiKey = env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY;
	assert(apiKey, "Missing `NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY` environment variable.");

	return createSearchClient({
		apiKey,
		cacheSearchResultsForSeconds,
		host: env.NEXT_PUBLIC_TYPESENSE_HOST,
		port: env.NEXT_PUBLIC_TYPESENSE_PORT,
		protocol: env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
	});
}

export const client = createClient();
