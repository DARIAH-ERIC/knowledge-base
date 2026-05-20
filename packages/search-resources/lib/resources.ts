import type { DariahCampusCurriculum, DariahCampusResource } from "@dariah-eric/client-campus";
import type { EpisciencesSearchDocument } from "@dariah-eric/client-episciences";
import type { SearchItem } from "@dariah-eric/client-sshoc";
import type { ZoteroJsonItem } from "@dariah-eric/client-zotero";
import type { ResourceDocument, WebsiteDocument } from "@dariah-eric/search";

import { createCampusCurriculum, createCampusResource } from "./campus";
import { createEpisciencesDocument } from "./episciences";
import { createSshocItem } from "./sshoc";
import { type ZoteroJsonItemData, createZoteroItem, isZoteroItemInCollection } from "./zotero";

export interface SearchIndexResourceSourceData {
	campusCurricula: Array<DariahCampusCurriculum>;
	campusResources: Array<DariahCampusResource>;
	episciencesDocuments: Array<EpisciencesSearchDocument>;
	sshocItems: Array<SearchItem>;
	zoteroItems: Array<ZoteroJsonItem<ZoteroJsonItemData>>;
}

export interface CreateSearchIndexResourceDocumentsParams {
	sourceData: SearchIndexResourceSourceData;
	sshocMarketplaceBaseUrl: string;
}

export function createSearchIndexResourceDocuments(
	params: CreateSearchIndexResourceDocumentsParams,
): Array<ResourceDocument> {
	const { sourceData, sshocMarketplaceBaseUrl } = params;
	const { campusCurricula, campusResources, episciencesDocuments, sshocItems, zoteroItems } =
		sourceData;

	return [
		...sshocItems.map((item) => createSshocItem(item, sshocMarketplaceBaseUrl)),
		...campusResources.map((item) => createCampusResource(item)),
		...campusCurricula.map((item) => createCampusCurriculum(item)),
		...episciencesDocuments.map((item) => createEpisciencesDocument(item)),
		...zoteroItems
			.filter((item) => isZoteroItemInCollection(item))
			.map((item) => createZoteroItem(item)),
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
		link: resource.links[0],
	};
}

export function createWebsiteResourceDocuments(
	resources: Array<ResourceDocument>,
): Array<WebsiteDocument> {
	return resources.map((resource) => createWebsiteResourceDocument(resource));
}
