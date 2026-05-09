import type { Locator, Page } from "@playwright/test";

import { fillSearchAndWaitForUrl } from "@/e2e/lib/fixtures/search";

const BASE_PATH = "/en/dashboard/website/news";

export class WebsiteNewsPage {
	readonly page: Page;
	readonly workerIndex: number;

	constructor(page: Page, workerIndex: number) {
		this.page = page;
		this.workerIndex = workerIndex;
	}

	get workerPrefix(): string {
		return `[e2e-worker-${String(this.workerIndex)}]`;
	}

	async goto(): Promise<void> {
		await this.page.goto(BASE_PATH);
		await this.page.waitForURL(`**${BASE_PATH}`);
	}

	async gotoCreate(): Promise<void> {
		await this.page.goto(`${BASE_PATH}/create`);
	}

	// ---------------------------------------------------------------------------
	// Form helpers
	// ---------------------------------------------------------------------------

	async fillTitle(title: string): Promise<void> {
		await this.page.getByLabel("Title").fill(title);
	}

	async fillSummary(summary: string): Promise<void> {
		await this.page.getByLabel("Summary").fill(summary);
	}

	async selectImageFromMediaLibrary(assetLabel: string): Promise<void> {
		await this.page.getByRole("button", { name: "Select image" }).click();
		await this.page.waitForSelector('[role="dialog"]');
		await this.page.waitForSelector('[role="gridcell"]');
		await this.page.getByRole("gridcell", { name: assetLabel }).click();
		await this.page.getByRole("dialog").getByRole("button", { name: "Select" }).click();
	}

	private relatedEntitiesSection(): Locator {
		return this.page
			.locator("section")
			.filter({ has: this.page.getByRole("heading", { name: "Related entities", level: 2 }) });
	}

	private relatedEntitiesDialog(): Locator {
		return this.page
			.getByRole("dialog")
			.filter({ has: this.page.getByRole("listbox", { name: "Related entities" }) });
	}

	async selectRelatedEntity(entityName: string): Promise<void> {
		const section = this.relatedEntitiesSection();
		const trigger = section.getByRole("button").first();
		const dialog = this.relatedEntitiesDialog();

		await trigger.click();
		await dialog.waitFor({ state: "visible" });

		const option = dialog.getByRole("option", { name: entityName, exact: true });
		const isOptionVisible = await option.isVisible().catch(() => {
			return false;
		});

		if (!isOptionVisible) {
			await dialog.getByRole("searchbox").fill(entityName);
			await dialog.getByRole("button", { name: "Search" }).click();
		}

		await dialog.getByRole("option", { name: entityName, exact: true }).click();
		await trigger.evaluate((element) => {
			(element as HTMLButtonElement).click();
		});
		await dialog.waitFor({ state: "hidden" });
	}

	async removeRelatedEntity(entityName: string): Promise<void> {
		const section = this.relatedEntitiesSection();
		const trigger = section.getByRole("button").first();
		const dialog = this.relatedEntitiesDialog();

		await trigger.click();
		await dialog.waitFor({ state: "visible" });
		await dialog
			.getByRole("grid", { name: "Selected items" })
			.getByRole("row", { name: entityName, exact: true })
			.getByRole("button")
			.click();
		await trigger.evaluate((element) => {
			(element as HTMLButtonElement).click();
		});
		await dialog.waitFor({ state: "hidden" });
	}

	async submitForm(): Promise<void> {
		await this.page.getByRole("button", { name: "Save" }).click();
		/** After a successful create/edit, the server action redirects back to the list. */
		await this.page.waitForURL(`**${BASE_PATH}`);
	}

	// ---------------------------------------------------------------------------
	// List page helpers
	// ---------------------------------------------------------------------------

	async searchByTitle(title: string): Promise<void> {
		await fillSearchAndWaitForUrl(this.page, BASE_PATH, title);
	}

	rowByTitle(title: string): Locator {
		return this.page.getByRole("row").filter({ hasText: title });
	}

	async openDeleteDialog(title: string): Promise<Locator> {
		const row = this.rowByTitle(title);
		await row.getByRole("button", { name: "Open actions menu" }).click();
		await this.page.getByRole("menuitem", { name: "Delete" }).click();
		return this.page.getByRole("dialog", { name: /Delete news item/i });
	}

	async confirmDelete(dialog: Locator): Promise<void> {
		await dialog.getByRole("button", { name: "Delete" }).click();
	}

	// ---------------------------------------------------------------------------
	// Details page — navigation
	// ---------------------------------------------------------------------------

	async gotoDetailsFromList(title: string): Promise<void> {
		await this.rowByTitle(title).click();
		await this.page.waitForURL(`**${BASE_PATH}/**/details`);
	}

	// ---------------------------------------------------------------------------
	// Details page — status badges
	// ---------------------------------------------------------------------------

	/** "Draft" badge in the lifecycle bar (only present when no published version exists). */
	detailsDraftBadge(): Locator {
		return this.page.getByText("Draft", { exact: true });
	}

	/** "Live" badge in the lifecycle bar (only present when published-only, no draft). */
	detailsLiveBadge(): Locator {
		return this.page.getByText("Live", { exact: true });
	}

	/** "Live with changes" badge in the lifecycle bar (draft + published both exist). */
	detailsLiveWithChangesBadge(): Locator {
		return this.page.getByText("Live with changes");
	}

	// ---------------------------------------------------------------------------
	// Details page — lifecycle actions
	// ---------------------------------------------------------------------------

	async publishItem(): Promise<void> {
		await this.page.getByRole("button", { name: "Publish" }).click();
		await this.page.waitForURL(`**${BASE_PATH}`);
	}

	async discardDraft(): Promise<void> {
		await this.page.getByRole("button", { name: "Discard draft" }).click();
		const dialog = this.page.getByRole("dialog");
		await dialog.waitFor({ state: "visible" });
		await dialog.getByRole("button", { name: "Discard" }).click();
		await this.page.waitForURL(`**${BASE_PATH}`);
	}

	// ---------------------------------------------------------------------------
	// Details page — version selector
	// ---------------------------------------------------------------------------

	versionSelectorDraftLink(): Locator {
		return this.page.getByRole("link", { name: "Draft" });
	}

	versionSelectorPublishedLink(): Locator {
		return this.page.getByRole("link", { name: "Published" });
	}

	// ---------------------------------------------------------------------------
	// List page — status badge within a row
	// ---------------------------------------------------------------------------

	/** "Live" status badge inside a specific list row. */
	liveBadgeInRow(title: string): Locator {
		return this.rowByTitle(title).getByText("Live", { exact: true });
	}

	/** "Draft" status badge inside a specific list row. */
	draftBadgeInRow(title: string): Locator {
		return this.rowByTitle(title).getByText("Draft", { exact: true });
	}
}
