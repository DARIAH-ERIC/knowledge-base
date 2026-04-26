import type { Page } from "@playwright/test";

export async function fillSearchAndWaitForUrl(
	page: Page,
	pathname: string,
	query: string,
): Promise<void> {
	const nextQuery = query.trim();

	await page.getByRole("searchbox").fill(query);
	await page.waitForURL((url) => {
		if (url.pathname !== pathname) {
			return false;
		}

		if (nextQuery === "") {
			return url.searchParams.get("q") == null;
		}

		return url.searchParams.get("q") === nextQuery;
	});
}
