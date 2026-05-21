import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Client } from "typesense";

const workingGroupActorIds = [
	"12778",
	"12307",
	"12303",
	"12309",
	"12102",
	"10359",
	"12777",
	"12304",
	"12302",
	"12776",
	"12305",
	"10283",
	"12774",
	"12308",
];

function getEnv(name: string, fallbackName?: string): string {
	const value = process.env[name] ?? (fallbackName != null ? process.env[fallbackName] : undefined);

	if (value == null || value === "") {
		const names = fallbackName != null ? `\`${name}\` or \`${fallbackName}\`` : `\`${name}\``;
		throw new Error(`Missing environment variable: ${names}.`);
	}

	return value;
}

const host = getEnv("TYPESENSE_HOST", "NEXT_PUBLIC_TYPESENSE_HOST");
const port = Number(getEnv("TYPESENSE_PORT", "NEXT_PUBLIC_TYPESENSE_PORT"));
const protocol = getEnv("TYPESENSE_PROTOCOL", "NEXT_PUBLIC_TYPESENSE_PROTOCOL") as "http" | "https";
const apiKey = getEnv("TYPESENSE_SEARCH_API_KEY", "NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY");
const collection =
	process.env.TYPESENSE_RESOURCE_COLLECTION_NAME ??
	process.env.NEXT_PUBLIC_TYPESENSE_RESOURCE_COLLECTION_NAME ??
	"dariah-resources";
const apiBaseUrl = getEnv("API_BASE_URL");
const outputFile = resolve(process.env.OUTPUT_FILE ?? "working-group-resources.json");

const sourceActorIds = workingGroupActorIds.map((actorId) => {
	return `ssh-open-marketplace:${actorId}`;
});

const filterBy = [
	"source:=ssh-open-marketplace",
	`source_actor_ids:=[${sourceActorIds.map((actorId) => `\`${actorId}\``).join(",")}]`,
].join(" && ");

const client = new Client({
	apiKey,
	connectionTimeoutSeconds: 5,
	nodes: [{ host, port, protocol }],
	numRetries: 3,
	retryIntervalSeconds: 0.1,
});

interface WorkingGroup {
	name: string;
	sshocMarketplaceActorId: number | null;
}

interface WorkingGroupsResponse {
	data: Array<WorkingGroup>;
	limit: number;
	offset: number;
	total: number;
}

interface ResourceOutput {
	id: string;
	label: string;
	sourceActorIds: Array<string> | null | undefined;
	type: string;
	workingGroups: Array<{ actorId: string; name: string }>;
}

async function getWorkingGroupNameByActorId(): Promise<Map<string, string>> {
	const limit = 100;
	let offset = 0;
	let total = 1;
	const nameByActorId = new Map<string, string>();

	while (offset < total) {
		const url = new URL("/api/v1/working-groups", apiBaseUrl);
		url.searchParams.set("limit", String(limit));
		url.searchParams.set("offset", String(offset));

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Failed to fetch working groups: ${response.status} ${response.statusText}`);
		}

		const result = (await response.json()) as WorkingGroupsResponse;

		for (const item of result.data) {
			if (item.sshocMarketplaceActorId != null) {
				nameByActorId.set(`ssh-open-marketplace:${item.sshocMarketplaceActorId}`, item.name);
			}
		}

		total = result.total;
		offset += result.limit;
	}

	return nameByActorId;
}

const perPage = 250;
let page = 1;
let totalPages = 1;
const resources: Array<ResourceOutput> = [];

console.log(`Querying collection "${collection}" with filter:`);
console.log(filterBy);

const workingGroupNameByActorId = await getWorkingGroupNameByActorId();

do {
	const result = await client.collections(collection).documents().search({
		filter_by: filterBy,
		page,
		per_page: perPage,
		q: "*",
		query_by: "label,description,keywords",
	});

	totalPages = Math.ceil(result.found / perPage);

	for (const hit of result.hits ?? []) {
		const document = hit.document as {
			id: string;
			label: string;
			source_actor_ids?: Array<string> | null;
			type: string;
		};
		const workingGroups =
			document.source_actor_ids
				?.map((actorId) => {
					const name = workingGroupNameByActorId.get(actorId);

					return name != null ? { actorId, name } : null;
				})
				.filter((item) => item != null) ?? [];

		resources.push({
			id: document.id,
			label: document.label,
			sourceActorIds: document.source_actor_ids,
			type: document.type,
			workingGroups,
		});
	}

	page += 1;
} while (page <= totalPages);

await writeFile(
	outputFile,
	JSON.stringify(
		{
			filterBy,
			resources,
			total: resources.length,
			workingGroupActorIds,
		},
		null,
		2,
	),
);

console.log(`Saved ${String(resources.length)} resources to ${outputFile}.`);
