import type { DariahCampusClient } from "@dariah-eric/client-campus";
import type { EpisciencesClient } from "@dariah-eric/client-episciences";
import type { SshocClient } from "@dariah-eric/client-sshoc";
import type { ZoteroClient } from "@dariah-eric/client-zotero";
import {
	type ResourceDocument,
	resourceSources,
	type SearchService,
	type WebsiteDocument,
} from "@dariah-eric/search";
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
	searchService: SearchService;
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
	failedCount: number;
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
	const {
		campus,
		episciences,
		search,
		searchService,
		sshoc,
		sshocMarketplaceBaseUrl,
		zotero,
		zoteroGroupId,
	} = params;

	const externalSourcesFilter = `source:[${resourceSources.join(",")}]`;

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

	async function getExistingResourceDocumentIds(): Promise<Set<string>> {
		const documentIds = new Set<string>();
		let page = 1;
		let totalPages = 1;

		do {
			const result = await searchService.collections.resources.search({
				filterBy: externalSourcesFilter,
				page,
				perPage: 250,
				query: "*",
			});

			if (result.isErr()) {
				throw result.error;
			}

			for (const item of result.value.items) {
				documentIds.add(item.document.id);
			}

			totalPages = result.value.pagination.totalPages;
			page += 1;
		} while (page <= totalPages);

		return documentIds;
	}

	async function getExistingWebsiteResourceDocumentIds(): Promise<Set<string>> {
		const documentIds = new Set<string>();
		let page = 1;
		let totalPages = 1;

		do {
			const result = await searchService.collections.website.search({
				filterBy: externalSourcesFilter,
				page,
				perPage: 250,
				query: "*",
			});

			if (result.isErr()) {
				throw result.error;
			}

			for (const item of result.value.items) {
				documentIds.add(item.document.id);
			}

			totalPages = result.value.pagination.totalPages;
			page += 1;
		} while (page <= totalPages);

		return documentIds;
	}

	async function deleteStaleDocuments(params: {
		currentDocuments: Array<ResourceDocument | WebsiteDocument>;
		deleteDocument: (documentId: string) => Promise<Result<void, unknown>>;
		existingDocumentIds: Set<string>;
		logContext: "resource" | "website resource";
	}): Promise<number> {
		const { currentDocuments, deleteDocument, existingDocumentIds, logContext } = params;
		const currentDocumentIds = new Set(
			currentDocuments.map((document) => {
				return document.id;
			}),
		);

		let failedCount = 0;

		for (const documentId of existingDocumentIds) {
			if (currentDocumentIds.has(documentId)) {
				continue;
			}

			const result = await deleteDocument(documentId);

			if (result.isErr()) {
				console.error(`Failed to delete stale ${logContext} search document.`, {
					documentId,
					error: result.error,
				});

				failedCount += 1;
			}
		}

		return failedCount;
	}

	async function syncSearchResources(
		options?: FetchSearchResourcesParams,
	): Promise<SyncSearchResourcesResult> {
		const sourceData = await fetchSearchIndexResourceSourceData(options);
		const resources = createResourceDocuments(sourceData);
		const websiteDocuments = createWebsiteResourceDocuments(resources);
		const [existingResourceDocumentIds, existingWebsiteResourceDocumentIds] = await Promise.all([
			getExistingResourceDocumentIds(),
			getExistingWebsiteResourceDocumentIds(),
		]);

		const resourcesIngestResult = await search.collections.resources.ingest(resources);
		if (resourcesIngestResult.isErr()) {
			throw resourcesIngestResult.error;
		}

		const websiteIngestResult = await search.collections.website.ingest(websiteDocuments);
		if (websiteIngestResult.isErr()) {
			throw websiteIngestResult.error;
		}

		const resourceDeleteFailedCount = await deleteStaleDocuments({
			currentDocuments: resources,
			deleteDocument(documentId) {
				return search.collections.resources.delete(documentId);
			},
			existingDocumentIds: existingResourceDocumentIds,
			logContext: "resource",
		});
		const websiteDeleteFailedCount = await deleteStaleDocuments({
			currentDocuments: websiteDocuments,
			deleteDocument(documentId) {
				return search.collections.website.delete(documentId);
			},
			existingDocumentIds: existingWebsiteResourceDocumentIds,
			logContext: "website resource",
		});

		return {
			count: resources.length,
			failedCount: resourceDeleteFailedCount + websiteDeleteFailedCount,
			websiteCount: websiteDocuments.length,
		};
	}

	return {
		createResourceDocuments,
		fetchSearchIndexResourceSourceData,
		syncSearchResources,
	};
}
