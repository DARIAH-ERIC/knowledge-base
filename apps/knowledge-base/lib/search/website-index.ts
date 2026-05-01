import {
	createWebsiteSearchIndexService,
	type SupportedWebsiteEntityType,
	supportedWebsiteEntityTypes,
	type SyncWebsiteDocumentResult,
	type WebsiteDocumentDescriptor,
} from "@dariah-eric/search-website";

import { db } from "@/lib/db";
import { search } from "@/lib/search/admin";

const websiteSearchIndex = createWebsiteSearchIndexService({ db, search });

export { supportedWebsiteEntityTypes };
export type {
	SupportedWebsiteEntityType as SupportedEntityType,
	SyncWebsiteDocumentResult,
	WebsiteDocumentDescriptor,
};

export const deleteWebsiteDocument = websiteSearchIndex.deleteWebsiteDocument;
export const createWebsiteEntityDocuments = websiteSearchIndex.createWebsiteEntityDocuments;
export const getSyncableWebsiteEntityIds = websiteSearchIndex.getSyncableWebsiteEntityIds;
export const getSyncableWebsiteEntityIdsByType =
	websiteSearchIndex.getSyncableWebsiteEntityIdsByType;
export const getWebsiteDocumentDescriptorByEntityId =
	websiteSearchIndex.getWebsiteDocumentDescriptorByEntityId;
export const getWebsiteDocumentForEntity = websiteSearchIndex.getWebsiteDocumentForEntity;
export const syncWebsiteDocumentForEntity = websiteSearchIndex.syncWebsiteDocumentForEntity;
export const syncWebsiteDocumentForEntityWithResult =
	websiteSearchIndex.syncWebsiteDocumentForEntityWithResult;
export const syncWebsiteSearchIndex = websiteSearchIndex.syncWebsiteSearchIndex;
