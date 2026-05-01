import * as path from "node:path";

import { assert, log } from "@acdh-oeaw/lib";
import { createDariahCampusClient } from "@dariah-eric/client-campus";
import { createEpisciencesClient } from "@dariah-eric/client-episciences";
import { createSshocClient } from "@dariah-eric/client-sshoc";
import { createZoteroClient } from "@dariah-eric/client-zotero";
import { createSearchService } from "@dariah-eric/search";
import { createSearchAdminService } from "@dariah-eric/search/admin";
import { createSearchResourcesService } from "@dariah-eric/search-resources";

import { env } from "../config/env.config.ts";
import { createCacheService } from "../lib/cache/index.ts";

const cache = createCacheService({
	cacheDir: path.join(process.cwd(), ".cache"),
});

assert(env.CAMPUS_API_BASE_URL, "Missing environment variable: `CAMPUS_API_BASE_URL`.");
assert(env.EPISCIENCES_API_BASE_URL, "Missing environment variable: `EPISCIENCES_API_BASE_URL`.");
assert(
	env.SSHOC_MARKETPLACE_API_BASE_URL,
	"Missing environment variable: `SSHOC_MARKETPLACE_API_BASE_URL`.",
);
assert(
	env.SSHOC_MARKETPLACE_BASE_URL,
	"Missing environment variable: `SSHOC_MARKETPLACE_BASE_URL`.",
);
assert(env.ZOTERO_API_BASE_URL, "Missing environment variable: `ZOTERO_API_BASE_URL`.");
assert(env.ZOTERO_GROUP_ID, "Missing environment variable: `ZOTERO_GROUP_ID`.");

const campus = createDariahCampusClient({
	config: {
		baseUrl: env.CAMPUS_API_BASE_URL,
	},
});

const episciences = createEpisciencesClient({
	config: {
		baseUrl: env.EPISCIENCES_API_BASE_URL,
	},
});

const sshoc = createSshocClient({
	config: {
		baseUrl: env.SSHOC_MARKETPLACE_API_BASE_URL,
	},
});

const zotero = createZoteroClient({
	config: {
		apiKey: env.ZOTERO_API_KEY,
		baseUrl: env.ZOTERO_API_BASE_URL,
	},
});

const search = createSearchAdminService({
	apiKey: env.TYPESENSE_ADMIN_API_KEY,
	collections: {
		resources: env.TYPESENSE_RESOURCE_COLLECTION_NAME,
		website: env.TYPESENSE_WEBSITE_COLLECTION_NAME,
	},
	nodes: [
		{
			host: env.TYPESENSE_HOST,
			port: env.TYPESENSE_PORT,
			protocol: env.TYPESENSE_PROTOCOL,
		},
	],
});

const searchService = createSearchService({
	apiKey: env.TYPESENSE_ADMIN_API_KEY,
	collections: {
		resources: env.TYPESENSE_RESOURCE_COLLECTION_NAME,
		website: env.TYPESENSE_WEBSITE_COLLECTION_NAME,
	},
	nodes: [
		{
			host: env.TYPESENSE_HOST,
			port: env.TYPESENSE_PORT,
			protocol: env.TYPESENSE_PROTOCOL,
		},
	],
});

const searchResources = createSearchResourcesService({
	campus,
	episciences,
	search,
	searchService,
	sshoc,
	sshocMarketplaceBaseUrl: env.SSHOC_MARKETPLACE_BASE_URL,
	zotero,
	zoteroGroupId: env.ZOTERO_GROUP_ID,
});

async function main(): Promise<void> {
	const result = await searchResources.syncSearchResources({ cache });

	log.info(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
	log.error(error);
	process.exitCode = 1;
});
