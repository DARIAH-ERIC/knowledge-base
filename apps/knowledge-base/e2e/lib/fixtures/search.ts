import type { Page } from "@playwright/test";

function matchesSearchUrl(url: URL, pathname: string, query: string): boolean {
	if (url.pathname !== pathname) {
		return false;
	}

	if (query === "") {
		return url.searchParams.get("q") == null;
	}

	return url.searchParams.get("q") === query;
}

export async function fillSearchAndWaitForUrl(
	page: Page,
	pathname: string,
	query: string,
): Promise<void> {
	const nextQuery = query.trim();
	await page.getByRole("searchbox").fill(query);

	if (matchesSearchUrl(new URL(page.url()), pathname, nextQuery)) {
		return;
	}

	await page.waitForURL((url) => matchesSearchUrl(url, pathname, nextQuery));
}
