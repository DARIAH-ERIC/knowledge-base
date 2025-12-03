import { createUrl, createUrlSearchParams, err, isErr, ok, type Result } from "@acdh-oeaw/lib";

import type { CollectionDocument } from "../schema";
import { request } from "../utils/request";

interface Response {
	count: number;
	hits: number;
	order: "score" | "label" | "modified-on";
	page: number;
	perpage: number;
	pages: number;
	q: string;
	items: Array<{
		properties: Array<{
			type: {
				code: string;
				label: string;
				type: string;
				groupName: string;
				hidden: boolean;
				ord: number;
				allowedVocabularies: Array<{
					code: string;
					scheme: string;
					namespace: string;
					label: string;
					closed: boolean;
				}>;
			};
			concept: {
				code: string;
				vocabulary: {
					code: string;
					scheme: string;
					namespace: string;
					label: string;
					closed: boolean;
				};
				label: string;
				notation: string;
				uri: string;
				candidate: boolean;
			};
		}>;
		id: number;
		category: "tool-or-service" | "training-material" | "workflow";
		description: string;
		label: string;
		version: string;
		persistentId: string;
		lastInfoUpdate: string;
		accessibleAt?: Array<string>;
	}>;
	categories: Record<string, { count: number; checked: boolean; label: string }>;
	facets: Record<string, unknown>;
}

/**
 * @see {@link https://marketplace-api.sshopencloud.eu/swagger-ui/index.html}
 */
export async function getDocuments(): Promise<Result<Array<CollectionDocument>, Error>> {
	const documents: Array<CollectionDocument> = [];

	const headers = {
		Accept: "application/json",
	};

	const url = createUrl({
		baseUrl: "https://marketplace-api.sshopencloud.eu",
		pathname: "/api/item-search",
		searchParams: createUrlSearchParams({
			"f.keyword": "DARIAH Resource",
			categories: ["tool-or-service", "training-material", "workflow"],
			perpage: 100,
		}),
	});

	let page = 1;
	let pages = 0;

	do {
		url.searchParams.set("page", String(page));

		const response = await request(url, { headers, responseType: "json" });

		if (isErr(response)) {
			return err(new Error("Failed to fetch data.", { cause: response.error }));
		}

		const data = response.value.data as Response;

		pages = data.pages;

		documents.push(
			...data.items.map<CollectionDocument>((item) => {
				const keywords = [];

				for (const property of item.properties) {
					if (property.type.code === "keyword" && property.concept.label !== "DARIAH Resource") {
						keywords.push(property.concept.label);
					}
				}

				const links = [
					String(
						createUrl({
							baseUrl: "https://marketplace.sshopencloud.eu",
							pathname: `/${item.category}/${item.persistentId}`,
						}),
					),
				];

				if (item.accessibleAt != null) {
					for (const link of item.accessibleAt) {
						links.push(link);
					}
				}

				const source = "ssh-open-marketplace";
				const source_id = item.persistentId;
				const id = [source, source_id].join(":");

				const document = {
					id,
					source,
					source_id,
					imported_at: Date.now(),
					title: item.label,
					description: item.description,
					keywords,
					links,
				} satisfies Partial<CollectionDocument>;

				switch (item.category) {
					case "tool-or-service": {
						const isCoreService = item.properties.some((property) => {
							return (
								property.type.code === "keyword" && property.concept.label === "DARIAH Core Service"
							);
						});

						return {
							...document,
							kind: "tool-or-service",
							type: isCoreService ? "core" : "community",
						};
					}

					case "training-material": {
						return {
							...document,
							kind: "training-material",
						};
					}

					case "workflow": {
						return {
							...document,
							kind: "workflow",
						};
					}
				}
			}),
		);
	} while (page++ <= pages);

	return ok(documents);
}
