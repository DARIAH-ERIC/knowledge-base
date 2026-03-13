import { createUrl, createUrlSearchParams } from "@acdh-oeaw/lib";
import { request } from "@dariah-eric/request";

import type { components, paths } from "./types";

type SearchItem = Required<GetDariahResources.Response["items"][number]>;
type SearchItems = Array<SearchItem>;

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace GetDariahResources {
	export type SearchParams = NonNullable<
		paths["/api/item-search"]["get"]["parameters"]["query"]
	> & {
		"f.keyword"?: Array<string>;
	};
	export type Response = Required<components["schemas"]["PaginatedSearchItems"]>;
}

export interface CreateSshocMarketplaceClientParams {
	config: {
		baseUrl: string;
	};
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createSshocMarketplaceClient(params: CreateSshocMarketplaceClientParams) {
	const { config } = params;

	const { baseUrl } = config;

	async function getResources({
		categories,
		perPage = 50,
	}: {
		categories: Required<GetDariahResources.SearchParams["categories"]>;
		perPage?: number;
	}): Promise<SearchItems> {
		let page = 1;
		let pages = 0;

		const filters: GetDariahResources.SearchParams = {
			categories,
			"f.keyword": ["DARIAH Resource"],
			order: ["label"],
			page,
			perpage: perPage,
		};

		const url = createUrl({
			baseUrl,
			pathname: "/api/item-search",
			searchParams: createUrlSearchParams(filters),
		});

		const items: SearchItems = [];

		do {
			const result = await request<GetDariahResources.Response>(url, {
				responseType: "json",
			});

			if (result.isErr()) {
				throw result.error;
			}

			const data = result.value.data;
			items.push(...(data.items as SearchItems));
			page++;
			pages = data.pages;
			url.searchParams.set("page", String(page));
		} while (pages >= page);

		return items;
	}

	function hasActorId(item: SearchItem, actorId: number): boolean {
		return item.contributors.some((contributor) => {
			return contributor.actor!.id === actorId && contributor.role!.code === "reviewer";
		});
	}

	function isCoreService(item: SearchItem): boolean {
		return item.properties.some((property) => {
			return property.type!.code === "keyword" && property.concept!.label === "DARIAH Core Service";
		});
	}

	function getResourceType(item: SearchItem): "software" | "service" {
		const resourceTypes = item.properties
			.filter((property) => {
				return property.type!.code === "resource-category";
			})
			.map((property) => {
				return property.concept!.label;
			});

		return resourceTypes.includes("Software") ? "software" : "service";
	}

	return {
		async getDariahResources() {
			const items = await getResources({ categories: ["tool-or-service"] });
			return items;
		},
		async getDariahResourcesByActorId(actorId: number) {
			const items = await getResources({ categories: ["tool-or-service"] });
			return items.filter((item) => {
				return hasActorId(item, actorId);
			});
		},
		hasActorId,
		isCoreService,
		getResourceType,
	};
}
