import { syncWebsiteSearchIndex as syncWebsiteSearchDocuments } from "@/lib/search/website-index";

export interface SyncWebsiteSearchIndexResult {
	count: number;
	failedCount: number;
}

export async function syncWebsiteSearchIndex(): Promise<SyncWebsiteSearchIndexResult> {
	const result = await syncWebsiteSearchDocuments();

	return {
		count: result.count,
		failedCount: 0,
	};
}
