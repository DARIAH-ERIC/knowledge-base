import type { Locator, Page } from "@playwright/test";

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

	async selectRelatedEntity(entityName: string): Promise<void> {
		const section = this.page
			.locator("section")
			.filter({ has: this.page.getByRole("heading", { name: "Related entities", level: 2 }) });
		const dialog = this.page.getByRole("dialog");

		await section.getByRole("button").last().click();
		await dialog.getByRole("searchbox").fill(entityName);
		await dialog.getByRole("option", { name: entityName }).click();
		await section.getByRole("button").last().click({ force: true });
		await dialog.waitFor({ state: "hidden" });
	}

	async removeRelatedEntity(entityName: string): Promise<void> {
		await this.page.getByRole("row", { name: entityName }).getByRole("button").click();
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
		await this.page.getByRole("searchbox").fill(title);
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
}
