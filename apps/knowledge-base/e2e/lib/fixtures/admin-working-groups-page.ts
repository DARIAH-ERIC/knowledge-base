import type { Locator, Page } from "@playwright/test";

const BASE_PATH = "/en/dashboard/administrator/working-groups";

export class AdminWorkingGroupsPage {
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

	async fillName(name: string): Promise<void> {
		await this.page.getByLabel("Name", { exact: true }).fill(name);
	}

	async fillSummary(text: string): Promise<void> {
		await this.page.getByLabel("Summary").fill(text);
	}

	async fillDescription(text: string): Promise<void> {
		const editor = this.page.getByRole("textbox", { name: "Description" });
		await editor.click();
		await this.page.keyboard.type(text);
	}

	async submitForm(): Promise<void> {
		await this.page.getByRole("button", { name: "Save" }).click();
		await this.page.waitForURL(`**${BASE_PATH}`);
	}

	// ---------------------------------------------------------------------------
	// List page helpers
	// ---------------------------------------------------------------------------

	async searchByName(name: string): Promise<void> {
		await this.page.getByRole("searchbox").fill(name);
	}

	rowByName(name: string): Locator {
		return this.page.getByRole("row").filter({ hasText: name });
	}

	async openDeleteDialog(name: string): Promise<Locator> {
		const row = this.rowByName(name);
		await row.getByRole("button", { name: "Open actions menu" }).click();
		await this.page.getByRole("menuitem", { name: "Delete" }).click();
		return this.page.getByRole("dialog", { name: /Delete working group/i });
	}

	async confirmDelete(dialog: Locator): Promise<void> {
		await dialog.getByRole("button", { name: "Delete" }).click();
	}
}
