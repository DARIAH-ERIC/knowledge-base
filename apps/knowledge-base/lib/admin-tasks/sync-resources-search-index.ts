import { createUrl, isNonEmptyString, unreachable } from "@acdh-oeaw/lib";
import {
	createDariahCampusClient,
	type DariahCampusCurriculum,
	type DariahCampusResource,
} from "@dariah-eric/client-campus";
import {
	createEpisciencesClient,
	type EpisciencesSearchDocument,
} from "@dariah-eric/client-episciences";
import { createSshocClient, type SearchItem } from "@dariah-eric/client-sshoc";
import { createZoteroClient, type ZoteroJsonItem } from "@dariah-eric/client-zotero";
import type { ResourceDocument } from "@dariah-eric/search";

import { env } from "@/config/env.config";
import { search } from "@/lib/search/admin";

interface ZoteroJsonItemData {
	title?: string;
	abstractNote?: string;
	creators?: Array<{
		firstName?: string;
		lastName?: string;
		creatorType?: string;
	}>;
	date?: string;
	tags?: Array<{ tag: string }>;
	url?: string;
	DOI?: string;
	itemType?: string;
	dateModified?: string;
	[key: string]: unknown;
}

export interface SyncResourcesSearchIndexResult {
	count: number;
}

function toPlainText(input: string): string {
	return input
		.replaceAll(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replaceAll(/[`*_>#-]/g, " ")
		.replaceAll(/\s+/g, " ")
		.trim();
}

function createCampusResourceDocument(item: DariahCampusResource): ResourceDocument {
	const source = "dariah-campus" as const;
	const sourceId = item.id;
	const id = [source, sourceId].join(":");
	const authors = [...item.authors, ...item.editors].map((person) => {
		return person.name;
	});
	const keywords = item.tags.map((tag) => {
		return tag.name;
	});
	const year = isNonEmptyString(item["publication-date"])
		? new Date(item["publication-date"]).getFullYear()
		: null;
	const links = isNonEmptyString(item.pid) ? [item.pid] : [];
	const sourceUpdatedAt = isNonEmptyString(item["publication-date"])
		? new Date(item["publication-date"]).getTime()
		: null;

	return {
		id,
		source,
		source_id: sourceId,
		source_updated_at: sourceUpdatedAt,
		imported_at: Date.now(),
		type: "training-material",
		label: item.title,
		description: toPlainText(item.summary.content),
		links,
		keywords,
		kind: null,
		source_actor_ids: [],
		upstream_sources: [],
		authors,
		year,
		pid: item.pid,
	};
}

function createCampusCurriculumDocument(item: DariahCampusCurriculum): ResourceDocument {
	const source = "dariah-campus" as const;
	const sourceId = item.id;
	const id = [source, sourceId].join(":");
	const authors = item.editors.map((person) => {
		return person.name;
	});
	const keywords = item.tags.map((tag) => {
		return tag.name;
	});
	const year = isNonEmptyString(item["publication-date"])
		? new Date(item["publication-date"]).getFullYear()
		: null;
	const links = isNonEmptyString(item.pid) ? [item.pid] : [];
	const sourceUpdatedAt = isNonEmptyString(item["publication-date"])
		? new Date(item["publication-date"]).getTime()
		: null;

	return {
		id,
		source,
		source_id: sourceId,
		source_updated_at: sourceUpdatedAt,
		imported_at: Date.now(),
		type: "training-material",
		label: item.title,
		description: toPlainText(item.summary.content),
		links,
		keywords,
		kind: null,
		source_actor_ids: [],
		upstream_sources: [],
		authors,
		year,
		pid: item.pid,
	};
}

function createEpisciencesDocumentResource(item: EpisciencesSearchDocument): ResourceDocument {
	const source = "episciences" as const;
	const sourceId = String(item.docid ?? item.paperid);
	const id = [source, sourceId].join(":");
	const authors = item.author_fullname_s ?? [];
	const keywords = item.keyword_t ?? [];
	const title =
		Array.isArray(item.paper_title_t) && item.paper_title_t.length > 0
			? item.paper_title_t[0]!
			: (item.en_paper_title_t ?? "");
	const description =
		Array.isArray(item.abstract_t) && item.abstract_t.length > 0
			? item.abstract_t[0]!
			: (item.en_abstract_t ?? "");
	const year =
		item.publication_date_year_fs != null
			? Number(item.publication_date_year_fs)
			: item.publication_date_tdate != null
				? new Date(item.publication_date_tdate).getFullYear()
				: null;
	const doi = item.doi_s ?? null;
	const links =
		item.es_doc_url_s != null
			? [item.es_doc_url_s]
			: item.es_pdf_url_s != null
				? [item.es_pdf_url_s]
				: doi != null
					? [`https://doi.org/${doi}`]
					: [];

	return {
		id,
		source,
		source_id: sourceId,
		source_updated_at:
			item.es_publication_date_tdate != null
				? new Date(item.es_publication_date_tdate).getTime()
				: null,
		imported_at: Date.now(),
		type: "publication",
		label: title,
		description,
		links,
		keywords,
		kind: null,
		source_actor_ids: null,
		upstream_sources: null,
		authors,
		year: year != null && !Number.isNaN(year) ? year : null,
		pid: doi,
	};
}

function createSshocResourceDocument(item: SearchItem): ResourceDocument {
	const keywords = [];

	for (const property of item.properties) {
		if (
			property.type.code === "keyword" &&
			property.concept?.vocabulary.code === "sshoc-keyword" &&
			property.concept.code !== "dariahResource"
		) {
			keywords.push(property.concept.label);
		}
	}

	const links = [
		String(
			createUrl({
				baseUrl: env.SSHOC_MARKETPLACE_BASE_URL!,
				pathname: `/${item.category}/${item.persistentId}`,
			}),
		),
		...(item.accessibleAt ?? []),
	];

	const source = "ssh-open-marketplace";
	const sourceId = item.persistentId;
	const id = [source, sourceId].join(":");
	const label = item.label.trim();
	const description = toPlainText(item.description);
	const sourceActorIds = item.contributors.flatMap((contributor) => {
		return contributor.actor.id;
	});
	const actorIds = sourceActorIds.map((sourceActorId) => {
		return [source, sourceActorId].join(":");
	});
	const sourceUpdatedAt = new Date(item.lastInfoUpdate).getTime();

	switch (item.category) {
		case "tool-or-service": {
			const isSoftware = item.properties.some((property) => {
				return (
					property.type.code === "resource-category" &&
					property.concept?.vocabulary.code === "eosc-resource-category" &&
					property.concept.code === "category-sharing_and_discovery-software"
				);
			});

			if (isSoftware) {
				return {
					id,
					source,
					source_id: sourceId,
					source_updated_at: sourceUpdatedAt,
					imported_at: Date.now(),
					type: "software",
					label,
					description,
					keywords,
					links,
					source_actor_ids: actorIds,
					upstream_sources: null,
					kind: null,
					authors: null,
					year: null,
					pid: null,
				};
			}

			const isCoreService = item.properties.some((property) => {
				return (
					property.type.code === "keyword" &&
					property.concept?.vocabulary.code === "sshoc-keyword" &&
					property.concept.code === "dariahCoreService"
				);
			});

			return {
				id,
				source,
				source_id: sourceId,
				source_updated_at: sourceUpdatedAt,
				imported_at: Date.now(),
				type: "service",
				label,
				description,
				keywords,
				links,
				source_actor_ids: actorIds,
				upstream_sources: null,
				kind: isCoreService ? "core" : "community",
				authors: null,
				year: null,
				pid: null,
			};
		}

		case "training-material": {
			return {
				id,
				source,
				source_id: sourceId,
				source_updated_at: sourceUpdatedAt,
				imported_at: Date.now(),
				type: "training-material",
				label,
				description,
				keywords,
				links,
				source_actor_ids: actorIds,
				upstream_sources: [],
				kind: null,
				authors: null,
				year: null,
				pid: null,
			};
		}

		case "workflow": {
			return {
				id,
				source,
				source_id: sourceId,
				source_updated_at: sourceUpdatedAt,
				imported_at: Date.now(),
				type: "workflow",
				label,
				description,
				keywords,
				links,
				source_actor_ids: actorIds,
				upstream_sources: null,
				kind: null,
				authors: null,
				year: null,
				pid: null,
			};
		}

		case "dataset":
		case "publication":
		case "step": {
			unreachable();
		}
	}
}

function createZoteroResourceDocument(item: ZoteroJsonItem<ZoteroJsonItemData>): ResourceDocument {
	const authors = [];

	for (const creator of item.data.creators ?? []) {
		const name = [creator.firstName, creator.lastName]
			.filter((name) => {
				return isNonEmptyString(name);
			})
			.join(" ");

		if (isNonEmptyString(name)) {
			authors.push(name);
		}
	}

	const yearRaw = item.data.date != null ? /\d{4}/.exec(item.data.date)?.[0] : null;
	const year = yearRaw != null ? Number(yearRaw) : null;
	const source = "zotero";
	const sourceId = item.key;
	const id = [source, sourceId].join(":");
	const sourceUpdatedAt =
		item.data.dateModified != null ? new Date(item.data.dateModified).getTime() : null;

	return {
		id,
		source,
		source_id: sourceId,
		source_updated_at: sourceUpdatedAt,
		imported_at: Date.now(),
		type: "publication",
		label: item.data.title ?? "",
		description: item.data.abstractNote ?? "",
		links: item.data.url != null ? [item.data.url] : [],
		keywords:
			item.data.tags
				?.map((tag) => {
					return tag.tag;
				})
				.filter((keyword) => {
					return isNonEmptyString(keyword);
				}) ?? [],
		kind: item.data.itemType ?? null,
		source_actor_ids: null,
		upstream_sources: null,
		authors,
		year,
		pid: item.data.DOI ?? null,
	};
}

export async function syncResourcesSearchIndex(): Promise<SyncResourcesSearchIndexResult> {
	if (env.CAMPUS_API_BASE_URL == null) {
		throw new Error("Missing environment variable: CAMPUS_API_BASE_URL");
	}

	if (env.EPISCIENCES_API_BASE_URL == null) {
		throw new Error("Missing environment variable: EPISCIENCES_API_BASE_URL");
	}

	if (env.SSHOC_MARKETPLACE_API_BASE_URL == null) {
		throw new Error("Missing environment variable: SSHOC_MARKETPLACE_API_BASE_URL");
	}

	if (env.SSHOC_MARKETPLACE_BASE_URL == null) {
		throw new Error("Missing environment variable: SSHOC_MARKETPLACE_BASE_URL");
	}

	if (env.ZOTERO_API_BASE_URL == null) {
		throw new Error("Missing environment variable: ZOTERO_API_BASE_URL");
	}

	if (env.ZOTERO_GROUP_ID == null) {
		throw new Error("Missing environment variable: ZOTERO_GROUP_ID");
	}

	const campus = createDariahCampusClient({
		config: {
			baseUrl: env.CAMPUS_API_BASE_URL,
		},
	});

	const episciences = createEpisciencesClient({
		config: {
			baseUrl: env.EPISCIENCES_API_BASE_URL,
		},
	});

	const sshoc = createSshocClient({
		config: {
			baseUrl: env.SSHOC_MARKETPLACE_API_BASE_URL,
		},
	});

	const zotero = createZoteroClient({
		config: {
			apiKey: env.ZOTERO_API_KEY,
			baseUrl: env.ZOTERO_API_BASE_URL,
		},
	});

	const [sshocItems, campusResources, campusCurricula, episciencesDocuments, zoteroItems] =
		await Promise.all([
			sshoc.items
				.searchAll({
					"f.keyword": ["DARIAH Resource"],
					categories: ["tool-or-service", "training-material", "workflow"],
					order: ["label"],
				})
				.then((result) => {
					return result.unwrap();
				}),
			campus.resources.listAll().then((result) => {
				return result.unwrap();
			}),
			campus.curricula.listAll().then((result) => {
				return result.unwrap();
			}),
			episciences.search.listAll().then((result) => {
				return result.unwrap();
			}),
			zotero.items.listAll({ groupId: env.ZOTERO_GROUP_ID }).then((result) => {
				return result.unwrap();
			}),
		]);

	const resources: Array<ResourceDocument> = [
		...sshocItems.map((item) => {
			return createSshocResourceDocument(item);
		}),
		...campusResources.map((item) => {
			return createCampusResourceDocument(item);
		}),
		...campusCurricula.map((item) => {
			return createCampusCurriculumDocument(item);
		}),
		...episciencesDocuments.map((item) => {
			return createEpisciencesDocumentResource(item);
		}),
		...zoteroItems.map((item) => {
			return createZoteroResourceDocument(item);
		}),
	];

	(await search.collections.resources.ingest(resources)).unwrap();

	return { count: resources.length };
}
