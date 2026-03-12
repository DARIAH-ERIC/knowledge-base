import { createUrl, createUrlSearchParams } from "@acdh-oeaw/lib";
import { request } from "@dariah-eric/request";
import type { paths, components } from "./types";

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
		async getTools() {
			const url = createUrl({
				baseUrl,
				pathname: "/api/item-search",
				searchParams: createUrlSearchParams({
					categories: ["tool-or-service"],
				}),
			});

			const result = await request<components["schemas"]["PaginatedSearchItems"]>(url, {
				responseType: "json",
			});

			return result;
		},
	};
}
