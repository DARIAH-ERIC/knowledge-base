import { type Locator, type Page } from "@playwright/test";

import { fillSearchAndWaitForUrl } from "@/e2e/lib/fixtures/search";

const ASSETS_PATH = "/en/dashboard/website/assets";

/**
 * The media library dialog is not a standalone page — it is embedded in admin forms. We open it
 * from the persons create form, which exposes a "Select image" trigger.
 */
const MEDIA_LIBRARY_HOST_PATH = "/en/dashboard/administrator/persons/create";

export class AssetsPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	// ---------------------------------------------------------------------------
	// Assets list page (`/dashboard/website/assets`)
	// ---------------------------------------------------------------------------

	async goto(): Promise<void> {
		await this.page.goto(ASSETS_PATH);
		await this.page.waitForURL(`**${ASSETS_PATH}`);
	}

	/** Types into the list search field and waits for the `q` URL param to settle. */
	async search(query: string): Promise<void> {
		await fillSearchAndWaitForUrl(this.page, ASSETS_PATH, query);
	}

	assetCardByLabel(label: string): Locator {
		return this.page.getByRole("listitem").filter({ hasText: label });
	}

	// ---------------------------------------------------------------------------
	// Media library dialog (embedded in forms, backed by `/api/assets`)
	// ---------------------------------------------------------------------------

	async openMediaLibraryDialog(): Promise<Locator> {
		await this.page.goto(MEDIA_LIBRARY_HOST_PATH);
		await this.page.getByRole("button", { name: "Select image" }).click();
		const dialog = this.page.getByRole("dialog", { name: "Media library" });
		await dialog.waitFor({ state: "visible" });
		return dialog;
	}

	/**
	 * Types into the dialog search field and resolves with the `/api/assets` response for the search
	 * request, so callers can assert the request succeeded (the query hits `getMediaLibraryAssets`).
	 */
	async searchInMediaLibrary(dialog: Locator, query: string): ReturnType<Page["waitForResponse"]> {
		const responsePromise = this.page.waitForResponse(
			(response) =>
				response.url().includes("/api/assets") &&
				new URL(response.url()).searchParams.get("q") === query,
		);
		await dialog.getByRole("searchbox").fill(query);
		return responsePromise;
	}

	mediaLibraryAssetByLabel(dialog: Locator, label: string): Locator {
		return dialog.getByRole("gridcell", { name: label });
	}
}
