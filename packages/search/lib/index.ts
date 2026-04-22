import { Result } from "better-result";
import { Client, type ConfigurationOptions } from "typesense";

import {
	type ResourceDocument,
	resourcesCollection,
	type ResourceSearchResult,
	type SearchResourcesParams,
} from "./collections/resources";
import {
	type SearchWebsiteParams,
	websiteCollection,
	type WebsiteDocument,
	type WebsiteSearchResult,
} from "./collections/website";
import { SearchError } from "./errors";

export type {
	ResourceDocument,
	ResourceHit,
	ResourceSearchResult,
	SearchResourcesParams,
} from "./collections/resources";
export { resourcesCollection, resourceServiceKinds, resourceTypes } from "./collections/resources";
export type {
	SearchWebsiteParams,
	WebsiteDocument,
	WebsiteHit,
	WebsiteSearchResult,
} from "./collections/website";
export { websiteCollection, websiteEntityTypes, websiteResourceTypes } from "./collections/website";

export interface SearchServiceConfig extends Pick<
	ConfigurationOptions,
	"cacheSearchResultsForSeconds"
> {}

export interface CreateSearchServiceParams {
	apiKey: string;
	nodes: Array<{ host: string; port: number; protocol: "http" | "https" }>;
	collections: {
		resources: string;
		website: string;
	};
	config?: SearchServiceConfig;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createSearchService(params: CreateSearchServiceParams) {
	const { apiKey, collections, nodes, config } = params;

	const client = new Client({
		apiKey,
		nodes,
		connectionTimeoutSeconds: 5,
		numRetries: 3,
		retryIntervalSeconds: 0.1,
		...config,
	});

	return {
		client,

		collections: {
			resources: {
				name: collections.resources,

				search(
					searchParams: SearchResourcesParams,
				): Promise<Result<ResourceSearchResult, SearchError>> {
					const { page = 1, perPage = 20, query } = searchParams;

					return Result.tryPromise({
						async try() {
							const result = await client
								.collections<ResourceDocument>(collections.resources)
								.documents()
								.search({
									q: query,
									query_by: resourcesCollection.queryableFields.join(","),
									per_page: perPage,
									page,
								});

							return {
								hits:
									result.hits?.map((hit) => {
										const { document, highlights = [] } = hit;

										return {
											document,
											highlight: Object.fromEntries(
												highlights.map(({ field, snippet }) => {
													return [field, snippet ?? ""];
												}),
											),
										};
									}) ?? [],
								found: result.found,
								page: result.page,
							};
						},
						catch(cause) {
							return new SearchError({ cause });
						},
					});
				},
			},

			website: {
				name: collections.website,

				search(
					searchParams: SearchWebsiteParams,
				): Promise<Result<WebsiteSearchResult, SearchError>> {
					const { page = 1, perPage = 20, query } = searchParams;

					return Result.tryPromise({
						async try() {
							const result = await client
								.collections<WebsiteDocument>(collections.website)
								.documents()
								.search({
									q: query,
									query_by: websiteCollection.queryableFields.join(","),
									per_page: perPage,
									page,
								});

							return {
								hits:
									result.hits?.map((hit) => {
										const { document, highlights = [] } = hit;

										return {
											document,
											highlight: Object.fromEntries(
												highlights.map(({ field, snippet }) => {
													return [field, snippet ?? ""];
												}),
											),
										};
									}) ?? [],
								found: result.found,
								page: result.page,
							};
						},
						catch(cause) {
							return new SearchError({ cause });
						},
					});
				},
			},
		},
	};
}

export type SearchService = ReturnType<typeof createSearchService>;
