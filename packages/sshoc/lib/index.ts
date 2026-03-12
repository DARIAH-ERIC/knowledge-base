import { createUrl, createUrlSearchParams } from "@acdh-oeaw/lib";
import { request } from "@dariah-eric/request";

import type { components, paths } from "./types";

export interface CreateSshocMarketplaceClientParams {
	config: {
		baseUrl: string;
	};
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createSshocMarketplaceClient(params: CreateSshocMarketplaceClientParams) {
	const { config } = params;

	const { baseUrl } = config;

	return {
		async getDariahResources() {
			type Filters = NonNullable<paths["/api/item-search"]["get"]["parameters"]["query"]> & {
				"f.keyword"?: Array<string>;
			};

			let page = 1;
			let hasMorePages = false;

			const filters: Filters = {
				categories: ["tool-or-service"],
				"f.keyword": ["DARIAH Resource"],
				order: ["label"],
				page,
				perpage: 50,
			};

			const url = createUrl({
				baseUrl,
				pathname: "/api/item-search",
				searchParams: createUrlSearchParams(filters),
			});

			const items = [];

			do {
				const result = await request<components["schemas"]["PaginatedSearchItems"]>(url, {
					responseType: "json",
				});

				if (result.isErr()) {
					throw result.error;
				}

				const data = result.value.data;
				items.push(...(data.items ?? []));
				page++;
				hasMorePages = (data.pages ?? 0) >= page;
				url.searchParams.set("page", String(page));
			} while (hasMorePages);

			return items;

			// const filtered = items.filter((item) => {
			// 	return item.contributors.some((contributor) => {
			// 		return contributor.actor?.id === marketplaceActorId && contributor.role.code === "reviewer";
			// 	});
			// });

			// return filtered.map((item) => {
			// 	const resourceTypes = item.properties
			// 		.filter((property) => {
			// 			return property.type.code === "resource-category";
			// 		})
			// 		.map((property) => {
			// 			return property.concept!.label;
			// 		});

			// 	const isCoreService = item.properties.some((property) => {
			// 		return property.type.code === "keyword" && property.concept!.label === "DARIAH Core Service";
			// 	});

			// 	const type = isCoreService
			// 		? ("Core service" as const)
			// 		: resourceTypes.includes("Software")
			// 			? ("Software" as const)
			// 			: ("Service" as const);

			// 	return {
			// 		id: item.persistentId,
			// 		label: item.label,
			// 		type,
			// 		accessibleAt: item.accessibleAt ?? [],
			// 	};
			// });
		},
	};
}
