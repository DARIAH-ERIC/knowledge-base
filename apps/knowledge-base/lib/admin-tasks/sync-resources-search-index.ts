import { assert } from "@acdh-oeaw/lib";
import { createDariahCampusClient } from "@dariah-eric/client-campus";
import { createEpisciencesClient } from "@dariah-eric/client-episciences";
import { createSshocClient } from "@dariah-eric/client-sshoc";
import { createZoteroClient } from "@dariah-eric/client-zotero";
import { createSearchResourcesService } from "@dariah-eric/search-resources";

import { env } from "@/config/env.config";
import { search } from "@/lib/search/admin";

export interface SyncResourcesSearchIndexResult {
	count: number;
	websiteCount: number;
}

export async function syncResourcesSearchIndex(): Promise<SyncResourcesSearchIndexResult> {
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

	const sshocMarketplaceBaseUrl = env.SSHOC_MARKETPLACE_BASE_URL;
	const zoteroGroupId = env.ZOTERO_GROUP_ID;

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
		sshoc,
		sshocMarketplaceBaseUrl,
		zotero,
		zoteroGroupId,
	});

	return searchResources.syncSearchResources();
}
