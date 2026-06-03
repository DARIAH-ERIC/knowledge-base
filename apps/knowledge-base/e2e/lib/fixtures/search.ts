import { type Page, expect } from "@playwright/test";

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
	const searchbox = page.getByRole("searchbox");

	// The search field drives the URL from a client effect, so a `fill` that lands before the list
	// page has hydrated is silently dropped and the URL never updates. Re-issue the input (clearing
	// first to force a change event even if the value is already present) until the URL reflects it.
	await expect(async () => {
		await searchbox.fill("");
		await searchbox.fill(query);
		await page.waitForURL((url) => matchesSearchUrl(url, pathname, nextQuery), { timeout: 2_000 });
	}).toPass({ timeout: 20_000 });
}
