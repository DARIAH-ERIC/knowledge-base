import type { DariahCampusCurriculum, DariahCampusResource } from "@dariah-eric/client-campus";
import type { EpisciencesSearchDocument } from "@dariah-eric/client-episciences";
import type { SearchItem } from "@dariah-eric/client-sshoc";
import type { ZoteroCollection, ZoteroJsonItem } from "@dariah-eric/client-zotero";
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
	workingGroups: Array<WorkingGroupSourceData>;
	zoteroCollections: Array<ZoteroCollection>;
	zoteroItems: Array<ZoteroJsonItem<ZoteroJsonItemData>>;
}

export interface WorkingGroupSourceData {
	slug: string;
	sshocMarketplaceActorId: number | null;
}

export interface CreateSearchIndexResourceDocumentsParams {
	sourceData: SearchIndexResourceSourceData;
	sshocMarketplaceBaseUrl: string;
}

function createZoteroCollectionActorIdsByKey(params: {
	collections: Array<ZoteroCollection>;
	workingGroups: Array<WorkingGroupSourceData>;
}): Map<string, Array<string>> {
	const { collections, workingGroups } = params;
	const collectionByKey = new Map(collections.map((collection) => [collection.key, collection]));
	const workingGroupsCollection = collections.find((collection) => {
		return collection.data.name === "Working groups";
	});
	const sourceActorIdBySlug = new Map(
		workingGroups.flatMap((workingGroup) => {
			if (workingGroup.sshocMarketplaceActorId == null) {
				return [];
			}

			return [
				[
					workingGroup.slug,
					`ssh-open-marketplace:${String(workingGroup.sshocMarketplaceActorId)}`,
				] as const,
			];
		}),
	);
	const sourceActorIdsByCollectionKey = new Map<string, Array<string>>();

	if (workingGroupsCollection == null) {
		return sourceActorIdsByCollectionKey;
	}

	const workingGroupsCollectionKey = workingGroupsCollection.key;

	function findWorkingGroupSlug(collection: ZoteroCollection): string | null {
		let current = collection;

		while (current.data.parentCollection !== false) {
			const parent = collectionByKey.get(current.data.parentCollection);

			if (parent == null) {
				return null;
			}

			if (parent.key === workingGroupsCollectionKey) {
				return current.data.name;
			}

			current = parent;
		}

		return null;
	}

	for (const collection of collections) {
		const slug = findWorkingGroupSlug(collection);
		const sourceActorId = slug != null ? sourceActorIdBySlug.get(slug) : undefined;

		if (sourceActorId != null) {
			sourceActorIdsByCollectionKey.set(collection.key, [sourceActorId]);
		}
	}

	return sourceActorIdsByCollectionKey;
}

function createZoteroItemSourceActorIds(
	item: ZoteroJsonItem<ZoteroJsonItemData>,
	sourceActorIdsByCollectionKey: Map<string, Array<string>>,
): Array<string> | null {
	const sourceActorIds = new Set<string>();

	for (const collectionKey of item.data.collections ?? []) {
		for (const sourceActorId of sourceActorIdsByCollectionKey.get(collectionKey) ?? []) {
			sourceActorIds.add(sourceActorId);
		}
	}

	return sourceActorIds.size > 0 ? [...sourceActorIds] : null;
}

export function createSearchIndexResourceDocuments(
	params: CreateSearchIndexResourceDocumentsParams,
): Array<ResourceDocument> {
	const { sourceData, sshocMarketplaceBaseUrl } = params;
	const {
		campusCurricula,
		campusResources,
		episciencesDocuments,
		sshocItems,
		workingGroups,
		zoteroCollections,
		zoteroItems,
	} = sourceData;
	const zoteroSourceActorIdsByCollectionKey = createZoteroCollectionActorIdsByKey({
		collections: zoteroCollections,
		workingGroups,
	});

	return [
		...sshocItems.map((item) => createSshocItem(item, sshocMarketplaceBaseUrl)),
		...campusResources.map((item) => createCampusResource(item)),
		...campusCurricula.map((item) => createCampusCurriculum(item)),
		...episciencesDocuments.map((item) => createEpisciencesDocument(item)),
		...zoteroItems
			.filter((item) => isZoteroItemInCollection(item))
			.map((item) => {
				return createZoteroItem(
					item,
					createZoteroItemSourceActorIds(item, zoteroSourceActorIdsByCollectionKey),
				);
			}),
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
