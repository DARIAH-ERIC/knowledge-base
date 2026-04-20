import { createUrl, createUrlSearchParams, isErr, request } from "@acdh-oeaw/lib";

import { env } from "../../config/env.config";
import {
	createWebsiteDocumentId,
	website,
	type WebsiteEntityDocument,
	type WebsiteEntityType,
	type WebsiteResourceDocument,
	type WebsiteResourceType,
} from "../schema";
import type { Client } from "./admin-client";
import { type ContentBlockLike, contentBlocksToPlaintext } from "./content-blocks-to-plaintext";

export interface WebsiteResourceSourceDocument {
	type: WebsiteResourceType;
	identifier: string;
	label: string;
	description?: string | null;
	url: string;
}

export interface WebsiteEntitySourceDocument {
	type: WebsiteEntityType;
	identifier: string;
	label: string;
	description?: string | null;
	contentBlocks?: Array<ContentBlockLike> | null;
	/** Only populated for news. */
	publication_date?: number | null;
	/** Slug of the page this entity links to. */
	slug: string;
}

function mapResourceDocument(source: WebsiteResourceSourceDocument): WebsiteResourceDocument {
	return {
		id: createWebsiteDocumentId(source.type, source.identifier),
		type: source.type,
		label: source.label,
		description: source.description?.trim() ?? "",
		url: source.url,
	};
}

function mapEntityDocument(source: WebsiteEntitySourceDocument): WebsiteEntityDocument {
	const description = source.description?.trim();

	return {
		id: createWebsiteDocumentId(source.type, source.identifier),
		type: source.type,
		label: source.label,
		description:
			description != null && description.length > 0
				? description
				: source.contentBlocks != null
					? contentBlocksToPlaintext(source.contentBlocks)
					: "",
		publication_date: source.publication_date ?? null,
		slug: source.slug,
	};
}

//

interface SshocResponse {
	pages: number;
	items: Array<{
		category: "tool-or-service" | "training-material" | "workflow";
		persistentId: string;
		label: string;
		description: string;
		accessibleAt?: Array<string>;
	}>;
}

async function getSshocResources(): Promise<Array<WebsiteResourceSourceDocument>> {
	const sources: Array<WebsiteResourceSourceDocument> = [];

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

		const response = await request(url, {
			headers: { Accept: "application/json" },
			responseType: "json",
		});

		if (isErr(response)) {
			throw new Error("Failed to fetch SSHOC resources.", { cause: response.error });
		}

		const data = response.value.data as SshocResponse;
		pages = data.pages;

		for (const item of data.items) {
			const url =
				item.accessibleAt?.[0] ??
				String(
					createUrl({
						baseUrl: "https://marketplace.sshopencloud.eu",
						pathname: `/${item.category}/${item.persistentId}`,
					}),
				);

			sources.push({
				type: item.category,
				identifier: item.persistentId,
				label: item.label,
				description: item.description,
				url,
			});
		}
	} while (page++ < pages);

	return sources;
}

//

interface PaginatedApiResponse<T> {
	data: Array<T>;
	total: number;
}

async function fetchOne<T>(pathname: string): Promise<T> {
	const url = createUrl({ baseUrl: env.API_BASE_URL, pathname });

	const response = await request(url, {
		headers: { Accept: "application/json" },
		responseType: "json",
	});

	if (isErr(response)) {
		throw new Error(`Failed to fetch ${pathname}.`, { cause: response.error });
	}

	return response.value.data as T;
}

async function fetchAll<T>(pathname: string, params?: Record<string, string>): Promise<Array<T>> {
	const items: Array<T> = [];
	const limit = 100;
	let offset = 0;
	let total = Infinity;

	do {
		const url = createUrl({
			baseUrl: env.API_BASE_URL,
			pathname,
			searchParams: createUrlSearchParams({ limit, offset, ...params }),
		});

		const response = await request(url, {
			headers: { Accept: "application/json" },
			responseType: "json",
		});

		if (isErr(response)) {
			throw new Error(`Failed to fetch ${pathname}.`, { cause: response.error });
		}

		const data = response.value.data as PaginatedApiResponse<T>;
		total = data.total;
		items.push(...data.data);
		offset += limit;
	} while (offset < total);

	return items;
}

//

async function getNewsEntities(): Promise<Array<WebsiteEntitySourceDocument>> {
	const items = await fetchAll<{
		title: string;
		summary: string;
		entity: { slug: string };
		publishedAt: string;
	}>("/api/v1/news");

	return items.map((item) => {
		return {
			type: "news",
			identifier: item.entity.slug,
			label: item.title,
			description: item.summary,
			publication_date: new Date(item.publishedAt).getTime(),
			slug: item.entity.slug,
		};
	});
}

async function getEventEntities(): Promise<Array<WebsiteEntitySourceDocument>> {
	const items = await fetchAll<{
		title: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/events");

	return items.map((item) => {
		return {
			type: "events",
			identifier: item.entity.slug,
			label: item.title,
			description: item.summary,
			slug: item.entity.slug,
		};
	});
}

async function getPageEntities(): Promise<Array<WebsiteEntitySourceDocument>> {
	const items = await fetchAll<{
		title: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/pages");

	return items.map((item) => {
		return {
			type: "pages",
			identifier: item.entity.slug,
			label: item.title,
			description: item.summary,
			slug: item.entity.slug,
		};
	});
}

async function getSpotlightEntities(): Promise<Array<WebsiteEntitySourceDocument>> {
	const items = await fetchAll<{
		title: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/spotlight-articles");

	return items.map((item) => {
		return {
			type: "spotlights",
			identifier: item.entity.slug,
			label: item.title,
			description: item.summary,
			slug: item.entity.slug,
		};
	});
}

async function getImpactCaseStudyEntities(): Promise<Array<WebsiteEntitySourceDocument>> {
	const items = await fetchAll<{
		title: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/impact-case-studies");

	return items.map((item) => {
		return {
			type: "impact-case-studies",
			identifier: item.entity.slug,
			label: item.title,
			description: item.summary,
			slug: item.entity.slug,
		};
	});
}

interface CountryListItem {
	id: string;
	name: string;
	summary: string;
	entity: { slug: string };
}

interface CountryDetail extends CountryListItem {
	institutions: Array<{ name: string; slug: string }>;
	nationalConsortium: { name: string; slug: string } | null;
}

async function getCountryEntities(): Promise<Array<WebsiteEntitySourceDocument>> {
	const countries = await fetchAll<CountryListItem>("/api/v1/members-partners");

	const details = await Promise.all(
		countries.map((country) => {
			return fetchOne<CountryDetail>(`/api/v1/members-partners/slugs/${country.entity.slug}`);
		}),
	);

	const countryEntities: Array<WebsiteEntitySourceDocument> = countries.map((item) => {
		return {
			type: "countries",
			identifier: item.entity.slug,
			label: item.name,
			description: item.summary,
			slug: item.entity.slug,
		};
	});

	const institutionEntities: Array<WebsiteEntitySourceDocument> = details.flatMap((detail) => {
		return detail.institutions.map((institution) => {
			return {
				type: "institutions" as const,
				identifier: institution.slug,
				label: institution.name,
				description: "",
				slug: detail.entity.slug,
			};
		});
	});

	const nationalConsortiumEntities: Array<WebsiteEntitySourceDocument> = details.flatMap(
		(detail) => {
			if (detail.nationalConsortium == null) {
				return [];
			}
			return [
				{
					type: "national-consortia" as const,
					identifier: detail.nationalConsortium.slug,
					label: detail.nationalConsortium.name,
					description: "",
					slug: detail.entity.slug,
				},
			];
		},
	);

	return [...countryEntities, ...institutionEntities, ...nationalConsortiumEntities];
}

async function getPersonEntities(): Promise<Array<WebsiteEntitySourceDocument>> {
	const items = await fetchAll<{
		name: string;
		position: string | null;
		entity: { slug: string };
	}>("/api/v1/persons");

	return items.map((item) => {
		return {
			type: "persons",
			identifier: item.entity.slug,
			label: item.name,
			description: item.position ?? "",
			slug: item.entity.slug,
		};
	});
}

async function getWorkingGroupEntities(): Promise<Array<WebsiteEntitySourceDocument>> {
	const items = await fetchAll<{
		name: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/working-groups");

	return items.map((item) => {
		return {
			type: "working-groups",
			identifier: item.entity.slug,
			label: item.name,
			description: item.summary,
			slug: item.entity.slug,
		};
	});
}

async function getDariahProjectEntities(): Promise<Array<WebsiteEntitySourceDocument>> {
	const items = await fetchAll<{
		name: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/dariah-projects");

	return items.map((item) => {
		return {
			type: "projects",
			identifier: item.entity.slug,
			label: item.name,
			description: item.summary,
			slug: item.entity.slug,
		};
	});
}

async function getDocumentPolicyEntities(): Promise<Array<WebsiteEntitySourceDocument>> {
	const items = await fetchAll<{
		title: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/documents-policies");

	return items.map((item) => {
		return {
			type: "documents-policies",
			identifier: item.entity.slug,
			label: item.title,
			description: item.summary,
			slug: item.entity.slug,
		};
	});
}

//

export async function ingestWebsite(client: Client): Promise<void> {
	const resourceSources = await getSshocResources();

	const entitySources = (
		await Promise.all([
			getNewsEntities(),
			getEventEntities(),
			getPageEntities(),
			getSpotlightEntities(),
			getImpactCaseStudyEntities(),
			getCountryEntities(),
			getPersonEntities(),
			getWorkingGroupEntities(),
			getDariahProjectEntities(),
			getDocumentPolicyEntities(),
		])
	).flat();

	const documents = [
		...resourceSources.map(mapResourceDocument),
		...entitySources.map(mapEntityDocument),
	];

	if (documents.length === 0) {
		return;
	}

	await client.collections(website.name).documents().import(documents);
}
