import {
	getSyncableWebsiteEntityIds,
	syncWebsiteDocumentForEntityWithResult,
} from "@/lib/search/website-index";

export interface SyncWebsiteSearchIndexResult {
	count: number;
	failedCount: number;
}

export async function syncWebsiteSearchIndex(): Promise<SyncWebsiteSearchIndexResult> {
	const entityIds = await getSyncableWebsiteEntityIds();
	const items = await Promise.all(
		entityIds.map((entityId) => {
			return syncWebsiteDocumentForEntityWithResult(entityId);
		}),
	);

	return {
		count: items.length,
		failedCount: items.filter((item) => {
			return !item.ok;
		}).length,
	};
}
