import type { Locator, Page } from "@playwright/test";

const BASE_PATH = "/en/dashboard/administrator/projects";

export class AdminProjectsPage {
	readonly page: Page;
	readonly workerIndex: number;

	readonly projectsTable: Locator;
	readonly newProjectLink: Locator;

	constructor(page: Page, workerIndex: number) {
		this.page = page;
		this.workerIndex = workerIndex;
		this.projectsTable = page.getByRole("table");
		this.newProjectLink = page.getByRole("link", { name: "New" });
	}

	get workerPrefix(): string {
		return `[e2e-worker-${String(this.workerIndex)}]`;
	}

	/** Navigate to the projects list page. */
	async goto(): Promise<void> {
		await this.page.goto(BASE_PATH);
		await this.page.waitForURL(`**${BASE_PATH}`);
	}

	/** Navigate to the create project form. */
	async gotoCreate(): Promise<void> {
		await this.page.goto(`${BASE_PATH}/create`);
	}

	/** Navigate to the edit form for a project identified by its slug. */
	async gotoEdit(slug: string): Promise<void> {
		await this.page.goto(`${BASE_PATH}/${slug}/edit`);
	}

	// ---------------------------------------------------------------------------
	// Form helpers
	// ---------------------------------------------------------------------------

	async fillName(name: string): Promise<void> {
		await this.page.getByRole("main").getByLabel("Name").fill(name);
	}

	async fillSummary(text: string): Promise<void> {
		await this.page.getByLabel("Summary").fill(text);
	}

	async selectFirstScope(): Promise<void> {
		const scopeControl = this.page
			.locator('[data-slot="control"]')
			.filter({ has: this.page.getByText("Scope", { exact: true }) });
		await scopeControl.locator("button").click();
		await this.page.getByRole("option").first().click();
	}

	async fillDatePicker(label: string, year: number, month: number, day: number): Promise<void> {
		const group = this.page.getByRole("group", { name: label });

		const daySegment = group.getByRole("spinbutton", { name: /day/i });
		const monthSegment = group.getByRole("spinbutton", { name: /month/i });
		const yearSegment = group.getByRole("spinbutton", { name: /year/i });

		await daySegment.click();
		await this.page.keyboard.type(String(day).padStart(2, "0"));

		await monthSegment.click();
		await this.page.keyboard.type(String(month).padStart(2, "0"));

		await yearSegment.click();
		await this.page.keyboard.type(String(year));
	}

	async selectImageFromMediaLibrary(assetLabel: string): Promise<void> {
		await this.page.getByRole("button", { name: "Select image" }).click();
		await this.page.waitForSelector('[role="dialog"]');
		await this.page.waitForSelector('[role="gridcell"]');
		await this.page.getByRole("gridcell", { name: assetLabel }).click();

		await this.page.getByRole("dialog").getByRole("button", { name: "Select" }).click();
	}

	async fillDescription(text: string): Promise<void> {
		const editor = this.page.getByRole("textbox", { name: "Description" });
		await editor.click();
		await this.page.keyboard.type(text);
	}

	async submitForm(): Promise<void> {
		await this.page.getByRole("button", { name: "Save" }).click();
		/** After a successful create/edit, the server action redirects back to the list. */
		await this.page.waitForURL(`**${BASE_PATH}`);
	}

	// ---------------------------------------------------------------------------
	// List page helpers
	// ---------------------------------------------------------------------------

	async searchByName(name: string): Promise<void> {
		await this.page.getByRole("searchbox").fill(name);
	}

	projectRowByName(name: string): Locator {
		return this.page.getByRole("row").filter({ hasText: name });
	}

	async openDeleteDialog(name: string): Promise<Locator> {
		const row = this.projectRowByName(name);
		await row.getByRole("button", { name: "Open actions menu" }).click();
		await this.page.getByRole("menuitem", { name: "Delete" }).click();
		return this.page.getByRole("dialog", { name: /Delete project/i });
	}

	async confirmDelete(dialog: Locator): Promise<void> {
		await dialog.getByRole("button", { name: "Delete" }).click();
	}
}
