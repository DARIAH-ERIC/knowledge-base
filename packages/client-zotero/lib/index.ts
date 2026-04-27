import { createUrl, createUrlSearchParams } from "@acdh-oeaw/lib";
import { request, type RequestResult } from "@dariah-eric/request";
import type { RequestError } from "@dariah-eric/request/errors";
import { Result } from "better-result";

/** CSL item types returned by Zotero's `format=csljson` responses.
 *
 * @see {@link https://www.zotero.org/support/dev/citation_styles/csl_0.8.1_syntax}
 */
export const zoteroCslItemTypes = [
	"article",
	"article-journal",
	"article-magazine",
	"article-newspaper",
	"bill",
	"book",
	"broadcast",
	"chapter",
	"classic",
	"collection",
	"dataset",
	"document",
	"entry",
	"entry-dictionary",
	"entry-encyclopedia",
	"event",
	"figure",
	"graphic",
	"hearing",
	"interview",
	"legal_case",
	"legislation",
	"manuscript",
	"map",
	"motion_picture",
	"musical_score",
	"pamphlet",
	"paper-conference",
	"patent",
	"performance",
	"periodical",
	"personal_communication",
	"post",
	"post-weblog",
	"regulation",
	"report",
	"review",
	"review-book",
	"software",
	"song",
	"speech",
	"standard",
	"thesis",
	"treaty",
	"webpage",
] as const;

export type ZoteroCslItemType = (typeof zoteroCslItemTypes)[number];

export interface ZoteroCslName {
	family?: string;
	given?: string;
	literal?: string;
	"non-dropping-particle"?: string;
	"dropping-particle"?: string;
	suffix?: string;
}

export interface ZoteroCslDate {
	"date-parts"?: [[number, number?, number?]];
	literal?: string;
	raw?: string;
}

export interface ZoteroCslItem {
	id: string;
	type: ZoteroCslItemType;
	abstract?: string;
	accessed?: ZoteroCslDate;
	author?: Array<ZoteroCslName>;
	"collection-title"?: string;
	"container-title"?: string;
	DOI?: string;
	edition?: string | number;
	editor?: Array<ZoteroCslName>;
	ISBN?: string;
	ISSN?: string;
	issue?: string | number;
	issued?: ZoteroCslDate;
	keyword?: string;
	language?: string;
	note?: string;
	page?: string;
	publisher?: string;
	"publisher-place"?: string;
	source?: string;
	title?: string;
	translator?: Array<ZoteroCslName>;
	URL?: string;
	version?: string;
	volume?: string | number;
}

export interface ZoteroCslJsonResponse {
	items: Array<ZoteroCslItem>;
}

export interface ZoteroJsonLibrary {
	type: string;
	id: number;
	name: string;
	links: Record<string, { href: string; type: string }>;
}

export type ZoteroJsonMeta = Record<string, unknown>;

export interface ZoteroJsonItem<TData extends Record<string, unknown> = Record<string, unknown>> {
	key: string;
	version: number;
	library: ZoteroJsonLibrary;
	links: Record<string, { href: string; type: string }>;
	meta: ZoteroJsonMeta;
	data: TData;
}

export interface ZoteroJsonItemsResponse<TItem extends ZoteroJsonItem = ZoteroJsonItem> {
	items: Array<TItem>;
}

export interface ZoteroCollectionData {
	key: string;
	version: number;
	name: string;
	parentCollection: string | false;
	relations: Record<string, unknown>;
}

export interface ZoteroCollection {
	key: string;
	version: number;
	library: {
		type: string;
		id: number;
		name: string;
		links: Record<string, { href: string; type: string }>;
	};
	links: Record<string, { href: string; type: string }>;
	meta: {
		numCollections: number;
		numItems: number;
	};
	data: ZoteroCollectionData;
}

export interface GetGroupItemsParams {
	groupId: string;
	limit?: number;
	start?: number;
}

export interface GetGroupCollectionsParams {
	groupId: string;
	limit?: number;
	start?: number;
}

export interface GetCollectionItemsParams {
	collectionId: string;
	groupId: string;
	limit?: number;
	start?: number;
}

export interface CreateZoteroClientParams {
	config: {
		apiKey?: string;
		baseUrl: string;
	};
}

const pageSize = 100;

/** Zotero item types used by the API `itemType` filter.
 *
 * @see {@link https://www.zotero.org/support/dev/web_api/v3/types_and_fields}
 * @see {@link https://api.zotero.org/itemTypes}
 */
export const zoteroItemTypes = [
	// "artwork",
	// "audioRecording",
	// "bill",
	"blogPost",
	"book",
	"bookSection",
	// "case",
	"conferencePaper",
	// "dataset",
	// "dictionaryEntry",
	// "document",
	// "email",
	// "encyclopediaArticle",
	// "film",
	// "forumPost",
	// "hearing",
	// "instantMessage",
	// "interview",
	"journalArticle",
	// "letter",
	// "magazineArticle",
	// "manuscript",
	// "map",
	// "newspaperArticle",
	// "note",
	// "patent",
	// "podcast",
	// "preprint",
	// "presentation",
	// "radioBroadcast",
	// "report",
	// "computerProgram",
	// "standard",
	// "statute",
	// "tvBroadcast",
	// "thesis",
	// "videoRecording",
	// "webpage",
] as const;

export type ZoteroItemType = (typeof zoteroItemTypes)[number];

const zoteroItemType = zoteroItemTypes.join(" || ");

function createListAll<TItem, TResponse, TBaseParams extends object>(
	getPage: (
		params: TBaseParams & { limit: number; start: number },
	) => Promise<RequestResult<TResponse>>,
	getItems: (response: TResponse) => Array<TItem>,
): (params: TBaseParams) => Promise<Result<Array<TItem>, RequestError>> {
	return (params) => {
		return Result.gen(async function* () {
			const items: Array<TItem> = [];
			let start = 0;
			let totalResults = Infinity;

			do {
				const pageParams: TBaseParams & { limit: number; start: number } = {
					...params,
					limit: pageSize,
					start,
				};
				const { data, headers } = yield* Result.await(getPage(pageParams));
				items.push(...getItems(data));
				totalResults = Number(headers.get("Total-Results"));
				start += pageSize;
			} while (start < totalResults);

			return Result.ok(items);
		});
	};
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createZoteroClient(params: CreateZoteroClientParams) {
	const { apiKey, baseUrl } = params.config;

	const headers = {
		...(apiKey != null ? { "Zotero-API-Key": apiKey } : undefined),
		"Zotero-API-Version": "3",
	};

	/** @see {@link https://www.zotero.org/support/dev/web_api/v3/basics#read_requests} */
	function getGroupItemsJson(
		params: GetGroupItemsParams,
	): Promise<RequestResult<ZoteroJsonItemsResponse>> {
		const { groupId, limit, start } = params;

		return request<ZoteroJsonItemsResponse>(
			createUrl({
				baseUrl,
				pathname: `/groups/${groupId}/items`,
				searchParams: createUrlSearchParams({
					itemType: zoteroItemType,
					limit,
					start,
				}),
			}),
			{ headers, responseType: "json" },
		);
	}

	/** @see {@link https://www.zotero.org/support/dev/web_api/v3/basics#read_requests} */
	function getGroupItemsCslJson(
		params: GetGroupItemsParams,
	): Promise<RequestResult<ZoteroCslJsonResponse>> {
		const { groupId, limit, start } = params;

		return request<ZoteroCslJsonResponse>(
			createUrl({
				baseUrl,
				pathname: `/groups/${groupId}/items`,
				searchParams: createUrlSearchParams({
					format: "csljson",
					itemType: zoteroItemType,
					limit,
					start,
				}),
			}),
			{ headers, responseType: "json" },
		);
	}

	/** @see {@link https://www.zotero.org/support/dev/web_api/v3/basics#read_requests} */
	function getGroupCollections(
		params: GetGroupCollectionsParams,
	): Promise<RequestResult<Array<ZoteroCollection>>> {
		const { groupId, limit, start } = params;

		return request<Array<ZoteroCollection>>(
			createUrl({
				baseUrl,
				pathname: `/groups/${groupId}/collections`,
				searchParams: createUrlSearchParams({ limit, start }),
			}),
			{ headers, responseType: "json" },
		);
	}

	/** @see {@link https://www.zotero.org/support/dev/web_api/v3/basics#read_requests} */
	function getCollectionItemsJson(
		params: GetCollectionItemsParams,
	): Promise<RequestResult<ZoteroJsonItemsResponse>> {
		const { collectionId, groupId, limit, start } = params;

		return request<ZoteroJsonItemsResponse>(
			createUrl({
				baseUrl,
				pathname: `/groups/${groupId}/collections/${collectionId}/items`,
				searchParams: createUrlSearchParams({
					itemType: zoteroItemType,
					limit,
					start,
				}),
			}),
			{ headers, responseType: "json" },
		);
	}

	/** @see {@link https://www.zotero.org/support/dev/web_api/v3/basics#read_requests} */
	function getCollectionItemsCslJson(
		params: GetCollectionItemsParams,
	): Promise<RequestResult<ZoteroCslJsonResponse>> {
		const { collectionId, groupId, limit, start } = params;

		return request<ZoteroCslJsonResponse>(
			createUrl({
				baseUrl,
				pathname: `/groups/${groupId}/collections/${collectionId}/items`,
				searchParams: createUrlSearchParams({
					format: "csljson",
					itemType: zoteroItemType,
					limit,
					start,
				}),
			}),
			{ headers, responseType: "json" },
		);
	}

	return {
		items: {
			list(params: GetGroupItemsParams): Promise<RequestResult<ZoteroJsonItemsResponse>> {
				return getGroupItemsJson(params);
			},

			listAll(
				params: Omit<GetGroupItemsParams, "limit" | "start">,
			): Promise<Result<Array<ZoteroJsonItem>, RequestError>> {
				return createListAll(getGroupItemsJson, (response) => {
					return response.items;
				})(params);
			},

			csljson: {
				list(params: GetGroupItemsParams): Promise<RequestResult<ZoteroCslJsonResponse>> {
					return getGroupItemsCslJson(params);
				},

				listAll(
					params: Omit<GetGroupItemsParams, "limit" | "start">,
				): Promise<Result<Array<ZoteroCslItem>, RequestError>> {
					return createListAll(getGroupItemsCslJson, (response) => {
						return response.items;
					})(params);
				},
			},
		},

		collections: {
			list(params: GetGroupCollectionsParams): Promise<RequestResult<Array<ZoteroCollection>>> {
				return getGroupCollections(params);
			},

			listAll(
				params: Omit<GetGroupCollectionsParams, "limit" | "start">,
			): Promise<Result<Array<ZoteroCollection>, RequestError>> {
				return createListAll(getGroupCollections, (response) => {
					return response;
				})(params);
			},

			items: {
				list(params: GetCollectionItemsParams): Promise<RequestResult<ZoteroJsonItemsResponse>> {
					return getCollectionItemsJson(params);
				},

				listAll(
					params: Omit<GetCollectionItemsParams, "limit" | "start">,
				): Promise<Result<Array<ZoteroJsonItem>, RequestError>> {
					return createListAll(getCollectionItemsJson, (response) => {
						return response.items;
					})(params);
				},

				csljson: {
					list(params: GetCollectionItemsParams): Promise<RequestResult<ZoteroCslJsonResponse>> {
						return getCollectionItemsCslJson(params);
					},

					listAll(
						params: Omit<GetCollectionItemsParams, "limit" | "start">,
					): Promise<Result<Array<ZoteroCslItem>, RequestError>> {
						return createListAll(getCollectionItemsCslJson, (response) => {
							return response.items;
						})(params);
					},
				},
			},
		},
	};
}

export type ZoteroClient = ReturnType<typeof createZoteroClient>;
