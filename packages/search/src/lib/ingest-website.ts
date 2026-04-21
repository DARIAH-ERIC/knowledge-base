import { assert, createUrl, createUrlSearchParams, isErr, request } from "@acdh-oeaw/lib";

import { env } from "../../config/env.config";
import { getDocuments } from "../get-documents";
import {
	type ResourceCollectionDocument,
	website,
	type WebsiteCollectionDocument,
} from "../schema";
import type { Client } from "./admin-client";
// import { contentBlocksToPlaintext } from "./content-blocks-to-plaintext";

// TODO: fetch content blocks from details endpoints and convert to plain text
//       probably easier to fetch directly from db? but then how would it work in github action.
// TODO: use navigation table to construct paths for entities?

assert(env.API_BASE_URL != null, "Missing api base url.");
const baseUrl = env.API_BASE_URL;

function mapResource(d: ResourceCollectionDocument): WebsiteCollectionDocument {
	return {
		id: d.id,
		description: d.description,
		label: d.label,
		type: d.type,
		publication_date: null,
		url: d.links.at(0) ?? null,
	};
}

interface PaginatedApiResponse<T> {
	data: Array<T>;
	total: number;
}

async function fetchOne<T>(pathname: string): Promise<T> {
	const url = createUrl({ baseUrl, pathname });

	const response = await request(url, { responseType: "json" });

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
			baseUrl,
			pathname,
			searchParams: createUrlSearchParams({ limit, offset, ...params }),
		});

		const response = await request(url, { responseType: "json" });

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

interface CountryListItem {
	id: string;
	name: string;
	summary: string;
	entity: { slug: string };
}

interface CountryDetail extends CountryListItem {
	institutions: Array<{ id: string; name: string; slug: string }>;
	nationalConsortium: { id: string; name: string; slug: string } | null;
}

async function getCountryEntities(): Promise<Array<WebsiteCollectionDocument>> {
	const countries = await fetchAll<CountryListItem>("/api/v1/members-partners");

	const details = await Promise.all(
		countries.map((country) => {
			return fetchOne<CountryDetail>(`/api/v1/members-partners/slugs/${country.entity.slug}`);
		}),
	);

	const countryEntities: Array<WebsiteCollectionDocument> = countries.map((item) => {
		const type = "country";

		return {
			id: [type, item.entity.slug].join(":"),
			type,
			label: item.name,
			description: item.summary,
			url: `/network/members-and-partners/${item.entity.slug}`,
		};
	});

	const institutionEntities: Array<WebsiteCollectionDocument> = details.flatMap((detail) => {
		return detail.institutions.map((institution) => {
			const type = "institution";

			return {
				id: [type, institution.slug].join(":"),
				type,
				label: institution.name,
				description: "",
				/** Partner institutions and cooperating partners are listed on the country page. */
				url: `/network/members-and-partners/${detail.entity.slug}`,
			};
		});
	});

	const nationalConsortiumEntities: Array<WebsiteCollectionDocument> = details.flatMap((detail) => {
		if (detail.nationalConsortium == null) {
			return [];
		}

		const type = "national-consortium";

		return [
			{
				id: [type, detail.nationalConsortium.slug].join(":"),
				type,
				label: detail.nationalConsortium.name,
				description: "",
				/** National consortia are listed on the country page. */
				url: `/network/members-and-partners/${detail.entity.slug}`,
			},
		];
	});

	return [...countryEntities, ...institutionEntities, ...nationalConsortiumEntities];
}

async function getDocumentPolicyEntities(): Promise<Array<WebsiteCollectionDocument>> {
	const items = await fetchAll<{
		id: string;
		title: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/documents-policies");

	return items.map((item) => {
		const type = "document-or-policy";

		return {
			id: [type, item.entity.slug].join(":"),
			type,
			label: item.title,
			description: item.summary,
			/** All documents are listed on the same page. */
			url: `/about/documents`,
		};
	});
}

async function getEventEntities(): Promise<Array<WebsiteCollectionDocument>> {
	const items = await fetchAll<{
		id: string;
		title: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/events");

	return items.map((item) => {
		const type = "event";

		return {
			id: [type, item.entity.slug].join(":"),
			type,
			label: item.title,
			description: item.summary,
			url: `/events/${item.entity.slug}`,
		};
	});
}

async function getNewsEntities(): Promise<Array<WebsiteCollectionDocument>> {
	const items = await fetchAll<{
		id: string;
		title: string;
		summary: string;
		entity: { slug: string };
		publishedAt: string;
	}>("/api/v1/news");

	return items.map((item) => {
		const type = "news-item";

		return {
			id: [type, item.entity.slug].join(":"),
			type,
			label: item.title,
			description: item.summary,
			publication_date: new Date(item.publishedAt).getTime(),
			url: `/news/${item.entity.slug}`,
		};
	});
}

async function getImpactCaseStudyEntities(): Promise<Array<WebsiteCollectionDocument>> {
	const items = await fetchAll<{
		id: string;
		title: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/impact-case-studies");

	return items.map((item) => {
		const type = "impact-case-study";

		return {
			id: [type, item.entity.slug].join(":"),
			type,
			label: item.title,
			description: item.summary,
			url: `/about/impact-case-studies/${item.entity.slug}`,
		};
	});
}

async function getPageEntities(): Promise<Array<WebsiteCollectionDocument>> {
	const items = await fetchAll<{
		id: string;
		title: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/pages");

	return items.map((item) => {
		const type = "page";

		return {
			id: [type, item.entity.slug].join(":"),
			type,
			label: item.title,
			description: item.summary,
			url: `/${item.entity.slug}`,
		};
	});
}

async function getProjectEntities(): Promise<Array<WebsiteCollectionDocument>> {
	const items = await fetchAll<{
		id: string;
		name: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/dariah-projects");

	return items.map((item) => {
		const type = "project";

		return {
			id: [type, item.entity.slug].join(":"),
			type,
			label: item.name,
			description: item.summary,
			url: `/projects/${item.entity.slug}`,
		};
	});
}

async function getPersonEntities(): Promise<Array<WebsiteCollectionDocument>> {
	const items = await fetchAll<{
		id: string;
		name: string;
		position: string | null;
		entity: { slug: string };
	}>("/api/v1/persons");

	return items.map((item) => {
		const type = "person";

		return {
			id: [type, item.entity.slug].join(":"),
			type,
			label: item.name,
			description: item.position ?? "",
			/** TODO: unclear where this should link to. */
			url: `/persons/${item.entity.slug}`,
		};
	});
}

async function getSpotlightEntities(): Promise<Array<WebsiteCollectionDocument>> {
	const items = await fetchAll<{
		id: string;
		title: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/spotlight-articles");

	return items.map((item) => {
		const type = "spotlight-article";

		return {
			id: [type, item.entity.slug].join(":"),
			type,
			label: item.title,
			description: item.summary,
			url: `/spotlights/${item.entity.slug}`,
		};
	});
}

async function getWorkingGroupEntities(): Promise<Array<WebsiteCollectionDocument>> {
	const items = await fetchAll<{
		id: string;
		name: string;
		summary: string;
		entity: { slug: string };
	}>("/api/v1/working-groups");

	return items.map((item) => {
		const type = "working-group";

		return {
			id: [type, item.entity.slug].join(":"),
			type,
			label: item.name,
			description: item.summary,
			url: `/network/working-groups/${item.entity.slug}`,
		};
	});
}

export async function ingest(client: Client): Promise<void> {
	const result = await getDocuments();

	if (isErr(result)) {
		throw result.error;
	}

	const resources = result.value.map((d) => {
		return mapResource(d);
	});

	const entities =( await Promise.all([
		getCountryEntities(),
		getDocumentPolicyEntities(),
		getEventEntities(),
		getNewsEntities(),
		getImpactCaseStudyEntities(),
		getPageEntities(),
		getPersonEntities(),
		getProjectEntities(),
		getSpotlightEntities(),
		getWorkingGroupEntities(),
	])).flat();

	const documents = [...resources, ...entities];

	await client.collections(website.name).documents().import(documents);
}
