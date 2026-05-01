import * as path from "node:path";

import { assert, log } from "@acdh-oeaw/lib";
import { createDariahCampusClient } from "@dariah-eric/client-campus";
import { createEpisciencesClient } from "@dariah-eric/client-episciences";
import { createSshocClient } from "@dariah-eric/client-sshoc";
import { createZoteroClient } from "@dariah-eric/client-zotero";
import { createDatabaseService } from "@dariah-eric/database";
import { createSearchService } from "@dariah-eric/search";
import { createSearchAdminService } from "@dariah-eric/search/admin";
import { createSearchResourcesService } from "@dariah-eric/search-resources";
import { createWebsiteSearchIndexService } from "@dariah-eric/search-website";

import { env } from "../config/env.config.ts";
import { createCacheService } from "../lib/cache/index.ts";

const db = createDatabaseService({
	connection: {
		database: env.DATABASE_NAME,
		host: env.DATABASE_HOST,
		password: env.DATABASE_PASSWORD,
		port: env.DATABASE_PORT,
		ssl: env.DATABASE_SSL_CONNECTION === "enabled",
		user: env.DATABASE_USER,
	},
	logger: true,
}).unwrap();

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

const websiteSearchIndex = createWebsiteSearchIndexService({ db, search, searchService });

async function main(): Promise<void> {
	const resources = await searchResources.syncSearchResources({ cache });

	log.success(
		`Synced ${String(resources.count)} external resources to resources and website indexes with ${String(resources.failedCount)} stale-delete failures.`,
	);

	const website = await websiteSearchIndex.syncWebsiteSearchIndex();

	log.success(`Synced ${String(website.count)} website entity documents.`);

	log.success("Successfully ingested data.");
}

main()
	.catch((error: unknown) => {
		log.error("Failed to ingest data.\n", error);
		process.exitCode = 1;
	})
	.finally(() => {
		return db.$client.end();
	});
