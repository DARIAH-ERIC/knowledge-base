import {
	createUrl,
	createUrlSearchParams,
	err,
	isErr,
	ok,
	request,
	type Result,
} from "@acdh-oeaw/lib";

import type { ResourceCollectionDocument } from "../schema";

interface PersonObject {
	id: string;
	name: string;
	orcid: string | null;
}

interface ResourceItem {
	id: string;
	pid: string;
	title: string;
	summary: {
		title: string;
		content: string;
	};
	"publication-date": string;
	"content-type": string;
	kind: "event" | "external" | "hosted" | "pathfinder";
	tags: Array<{ id: string; name: string }>;
	authors: Array<PersonObject>;
	contributors: Array<PersonObject>;
	editors: Array<PersonObject>;
	external?: {
		url: string;
		"publication-date": string;
	};
	"dariah-national-consortia": Array<{ code: string; "sshoc-marketplace-id": string }>;
	"dariah-working-groups": Array<{ slug: string; "sshoc-marketplace-id": string }>;
}

interface Response {
	total: number;
	limit: number;
	offset: number;
	items: Array<ResourceItem>;
}

/**
 * @see {@link https://campus.dariah.eu/openapi.json}
 */
export async function getDocuments(): Promise<Result<Array<ResourceCollectionDocument>, Error>> {
	const documents: Array<ResourceCollectionDocument> = [];

	const headers = {
		Accept: "application/json",
	};

	const limit = 100;
	let offset = 0;
	let total = Infinity;

	do {
		const url = createUrl({
			baseUrl: "https://campus.dariah.eu",
			pathname: "/api/v2/metadata/resources",
			searchParams: createUrlSearchParams({ limit, offset }),
		});

		const response = await request(url, { headers, responseType: "json" });

		if (isErr(response)) {
			return err(new Error("Failed to fetch data.", { cause: response.error }));
		}

		const data = response.value.data as Response;

		total = data.total;

		documents.push(
			...data.items.map<ResourceCollectionDocument>((item) => {
				const source = "ssh-open-marketplace" as const;
				const sourceId = item.id;
				const id = [source, sourceId].join(":");

				const links: Array<string> = [
					String(
						createUrl({
							baseUrl: "https://campus.dariah.eu",
							pathname: `/resources/${item.kind}/${item.id}`,
						}),
					),
				];

				if (item.external?.url != null) {
					links.push(item.external.url);
				}

				const sourceActorIds = [
					...item["dariah-national-consortia"],
					...item["dariah-working-groups"],
				].map((item) => {
					return item["sshoc-marketplace-id"];
				});

				return {
					id,
					source,
					source_id: sourceId,
					upstream_sources: ["DARIAH Campus"],
					imported_at: Date.now(),
					updated_at: new Date(item["publication-date"]).getTime(),
					type: "training-material",
					label: item.title,
					description: item.summary.content,
					keywords: item.tags.map((tag) => {
						return tag.name;
					}),
					links,
					source_actor_ids: sourceActorIds,
				};
			}),
		);

		offset += limit;
	} while (offset < total);

	return ok(documents);
}
