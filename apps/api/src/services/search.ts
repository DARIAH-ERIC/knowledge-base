import { createSearchClient } from "@dariah-eric/search/client";

import { env } from "~/config/env.config";

export const searchClient = createSearchClient({
	apiKey: env.TYPESENSE_SEARCH_API_KEY,
	host: env.TYPESENSE_HOST,
	port: env.TYPESENSE_PORT,
	protocol: env.TYPESENSE_PROTOCOL,
});
