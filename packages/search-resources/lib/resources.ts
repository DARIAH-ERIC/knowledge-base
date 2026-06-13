import type { DariahCampusCurriculum, DariahCampusResource } from "@dariah-eric/client-campus";
import type { EpisciencesPaper, EpisciencesSearchDocument } from "@dariah-eric/client-episciences";
import type { SearchItem } from "@dariah-eric/client-sshoc";
import type { ZoteroCollection, ZoteroJsonItem } from "@dariah-eric/client-zotero";
import type { ResourceDocument, WebsiteDocument } from "@dariah-eric/search";

import { createCampusCurriculum, createCampusResource } from "./campus";
import { createEpisciencesDocument } from "./episciences";
import { createSshocItem } from "./sshoc";
import {
	type ZoteroCollectionLookup,
	type ZoteroJsonItemData,
	createZoteroItem,
	isZoteroItemInCollection,
} from "./zotero";

/**
 * A full paper record paired with the search document `docid` it was fetched for. The pairing is
 * kept explicit because a search `docid` can be a version id that differs from the canonical
 * `paperid` on the returned record, so the record cannot be matched back to its search document by
 * id alone.
 */
export interface EpisciencesPaperEntry {
	docId: number;
	paper: EpisciencesPaper;
}

export interface SearchIndexResourceSourceData {
	campusCurricula: Array<DariahCampusCurriculum>;
	campusResources: Array<DariahCampusResource>;
	episciencesDocuments: Array<EpisciencesSearchDocument>;
	/** Full paper records, fetched per document to obtain the journal DOI and repository links. */
	episciencesPapers: Array<EpisciencesPaperEntry>;
	sshocItems: Array<SearchItem>;
	zoteroItems: Array<ZoteroJsonItem<ZoteroJsonItemData>>;
	zoteroCollections: Array<ZoteroCollection>;
}

export interface OrgUnitResourceLookups {
	sshocActorIdToNc: Map<number, Set<string>>;
	sshocActorIdToWg: Map<number, Set<string>>;
	sshocActorIdToInstitution: Map<number, Set<string>>;
	countrySlugToNc: Map<string, Set<string>>;
	wgSlugs: Set<string>;
}

export interface CreateSearchIndexResourceDocumentsParams {
	sourceData: SearchIndexResourceSourceData;
	sshocMarketplaceBaseUrl: string;
	zoteroGroupId: string;
	orgUnits: OrgUnitResourceLookups;
}

function buildZoteroCollectionLookup(
	zoteroCollections: Array<ZoteroCollection>,
): ZoteroCollectionLookup {
	const namesByKey = new Map<string, string>();
	for (const collection of zoteroCollections) {
		namesByKey.set(collection.key, collection.data.name);
	}
	return { namesByKey };
}

export function createSearchIndexResourceDocuments(
	params: CreateSearchIndexResourceDocumentsParams,
): Array<ResourceDocument> {
	const { sourceData, sshocMarketplaceBaseUrl, zoteroGroupId, orgUnits } = params;
	const {
		campusCurricula,
		campusResources,
		episciencesDocuments,
		episciencesPapers,
		sshocItems,
		zoteroItems,
		zoteroCollections,
	} = sourceData;

	const zoteroCollectionLookup = buildZoteroCollectionLookup(zoteroCollections);
	const episciencesPaperByDocId = new Map(
		episciencesPapers.map((entry) => [entry.docId, entry.paper]),
	);

	return [
		...sshocItems.map((item) => createSshocItem(item, sshocMarketplaceBaseUrl, orgUnits)),
		...campusResources.map((item) => createCampusResource(item)),
		...campusCurricula.map((item) => createCampusCurriculum(item)),
		...episciencesDocuments.map((item) =>
			createEpisciencesDocument(
				item,
				item.docid != null ? episciencesPaperByDocId.get(item.docid) : undefined,
			),
		),
		...zoteroItems
			.filter((item) => isZoteroItemInCollection(item))
			.map((item) => createZoteroItem(item, zoteroCollectionLookup, orgUnits, zoteroGroupId)),
	];
}

export function createWebsiteResourceDocument(resource: ResourceDocument): WebsiteDocument {
	return {
		id: resource.id,
		kind: "resource",
		source: resource.source,
		source_id: resource.source_id,
		source_updated_at: resource.source_updated_at,
		imported_at: resource.imported_at,
		type: resource.type,
		label: resource.label,
		description: resource.description,
		link: resource.links[0] ?? resource.source_url,
	};
}

export function createWebsiteResourceDocuments(
	resources: Array<ResourceDocument>,
): Array<WebsiteDocument> {
	return resources.map((resource) => createWebsiteResourceDocument(resource));
}
