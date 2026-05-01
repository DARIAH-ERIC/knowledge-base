import type { DariahCampusClient } from "@dariah-eric/client-campus";
import type { EpisciencesClient } from "@dariah-eric/client-episciences";
import type { SshocClient } from "@dariah-eric/client-sshoc";
import type { ZoteroClient } from "@dariah-eric/client-zotero";
import type { SearchAdminService } from "@dariah-eric/search/admin";
import { Result } from "better-result";

import {
	createSearchIndexResourceDocuments,
	createWebsiteResourceDocuments,
	type SearchIndexResourceSourceData,
} from "./resources";

export interface SearchResourcesCache<CacheError = unknown> {
	getOrFetch<T, FetchError>(
		key: string,
		fetcher: () => Promise<Result<T, FetchError>>,
	): Promise<Result<T, FetchError | CacheError>>;
}

export interface CreateSearchResourcesServiceParams {
	campus: DariahCampusClient;
	episciences: EpisciencesClient;
	search: SearchAdminService;
	sshoc: SshocClient;
	sshocMarketplaceBaseUrl: string;
	zotero: ZoteroClient;
	zoteroGroupId: string;
}

export interface FetchSearchResourcesParams {
	cache?: SearchResourcesCache;
}

export interface SyncSearchResourcesResult {
	count: number;
	websiteCount: number;
}

function getOrFetch<T, FetchError, CacheError>(
	cache: SearchResourcesCache<CacheError> | undefined,
	key: string,
	fetcher: () => Promise<Result<T, FetchError>>,
): Promise<Result<T, FetchError | CacheError>> {
	if (cache == null) {
		return fetcher();
	}

	return cache.getOrFetch(key, fetcher);
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createSearchResourcesService(params: CreateSearchResourcesServiceParams) {
	const { campus, episciences, search, sshoc, sshocMarketplaceBaseUrl, zotero, zoteroGroupId } =
		params;

	async function fetchSearchIndexResourceSourceData(
		options?: FetchSearchResourcesParams,
	): Promise<SearchIndexResourceSourceData> {
		const cache = options?.cache;

		const result = await Result.gen(async function* () {
			const [
				sshocItemsResult,
				campusResourcesResult,
				campusCurriculaResult,
				episciencesDocumentsResult,
				zoteroItemsResult,
			] = await Promise.all([
				getOrFetch(cache, "sshoc/items", () => {
					return sshoc.items.searchAll({
						"f.keyword": ["DARIAH Resource"],
						categories: ["tool-or-service", "training-material", "workflow"],
						order: ["label"],
					});
				}),
				getOrFetch(cache, "campus/resources", () => {
					return campus.resources.listAll();
				}),
				getOrFetch(cache, "campus/curricula", () => {
					return campus.curricula.listAll();
				}),
				getOrFetch(cache, "episciences/documents", () => {
					return episciences.search.listAll();
				}),
				getOrFetch(cache, "zotero/items", () => {
					return zotero.items.listAll({ groupId: zoteroGroupId });
				}),
			]);

			const sshocItems = yield* sshocItemsResult;
			const campusResources = yield* campusResourcesResult;
			const campusCurricula = yield* campusCurriculaResult;
			const episciencesDocuments = yield* episciencesDocumentsResult;
			const zoteroItems = yield* zoteroItemsResult;

			return Result.ok({
				campusCurricula,
				campusResources,
				episciencesDocuments,
				sshocItems,
				zoteroItems,
			});
		});

		return result.unwrap();
	}

	function createResourceDocuments(sourceData: SearchIndexResourceSourceData) {
		return createSearchIndexResourceDocuments({
			sourceData,
			sshocMarketplaceBaseUrl,
		});
	}

	async function syncSearchResources(
		options?: FetchSearchResourcesParams,
	): Promise<SyncSearchResourcesResult> {
		const sourceData = await fetchSearchIndexResourceSourceData(options);
		const resources = createResourceDocuments(sourceData);
		const websiteDocuments = createWebsiteResourceDocuments(resources);

		const result = await Result.gen(async function* () {
			yield* Result.await(search.collections.resources.ingest(resources));
			yield* Result.await(search.collections.website.ingest(websiteDocuments));

			return Result.ok({
				count: resources.length,
				websiteCount: websiteDocuments.length,
			});
		});

		return result.unwrap();
	}

	return {
		createResourceDocuments,
		fetchSearchIndexResourceSourceData,
		syncSearchResources,
	};
}
