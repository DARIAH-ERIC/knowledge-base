import type { Locator, Page } from "@playwright/test";

/** Base path for the admin projects section (without locale prefix). */
const BASE_PATH = "/en/dashboard/administrator/projects";

/**
 * Page object for the admin projects area.
 * All navigation helpers use absolute paths with the `en` locale prefix.
 */
export class AdminProjectsPage {
	readonly page: Page;
	readonly workerIndex: number;

	// List page locators
	readonly projectsTable: Locator;
	readonly newProjectLink: Locator;

	constructor(page: Page, workerIndex: number) {
		this.page = page;
		this.workerIndex = workerIndex;
		this.projectsTable = page.getByRole("table");
		this.newProjectLink = page.getByRole("link", { name: "New" });
	}

	/** Prefix for project names created by this worker. */
	get workerPrefix(): string {
		return `[e2e-worker-${String(this.workerIndex)}]`;
	}

	/** Navigate to the projects list page. */
	async goto(): Promise<void> {
		await this.page.goto(BASE_PATH);
		await this.page.waitForURL(`**${BASE_PATH}**`);
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

	/** Fill the project Name field. */
	async fillName(name: string): Promise<void> {
		await this.page.getByLabel("Name").fill(name);
	}

	/** Fill the project Summary textarea. */
	async fillSummary(text: string): Promise<void> {
		await this.page.getByLabel("Summary").fill(text);
	}

	/**
	 * Select the first available scope from the Scope dropdown.
	 * React Aria Select renders a button labelled by the field label; clicking it
	 * opens a listbox from which we pick the first option.
	 */
	async selectFirstScope(): Promise<void> {
		// The Select component renders inside a fieldStyles container with a label "Scope"
		const scopeControl = this.page
			.locator('[data-slot="control"]')
			.filter({ has: this.page.getByText("Scope", { exact: true }) });
		await scopeControl.locator('[data-slot="select-trigger"]').click();
		await this.page.getByRole("option").first().click();
	}

	/**
	 * Fill a React Aria DatePicker field by typing into its date segments.
	 *
	 * @param label  - The visible label text of the date field (e.g. "Start date")
	 * @param year   - 4-digit year
	 * @param month  - 1-based month (1 = January)
	 * @param day    - day of month
	 */
	async fillDatePicker(label: string, year: number, month: number, day: number): Promise<void> {
		// The DatePicker wraps its segments in a group labelled by the Label component.
		const group = this.page.getByRole("group", { name: label });

		// React Aria DateSegments expose role="spinbutton" with aria-label including
		// the segment type ("month", "day", "year").
		const daySegment = group.getByRole("spinbutton", { name: /day/i });
		const monthSegment = group.getByRole("spinbutton", { name: /month/i });
		const yearSegment = group.getByRole("spinbutton", { name: /year/i });

		// Click each segment and type the value. React Aria accepts digit key presses
		// on spinbuttons and accumulates them into the segment value.
		await daySegment.click();
		await this.page.keyboard.type(String(day).padStart(2, "0"));

		await monthSegment.click();
		await this.page.keyboard.type(String(month).padStart(2, "0"));

		await yearSegment.click();
		await this.page.keyboard.type(String(year));
	}

	/**
	 * Open the media library modal and select the asset with the given key,
	 * then confirm the selection.
	 */
	async selectImageFromMediaLibrary(assetKey: string): Promise<void> {
		// Open the modal
		await this.page.getByRole("button", { name: "Select image" }).click();
		await this.page.waitForSelector('[role="dialog"]');

		// Click the asset in the grid list (identified by its key as the item id)
		await this.page.getByRole("gridcell", { name: assetKey }).click();

		// Confirm selection
		await this.page.getByRole("dialog").getByRole("button", { name: "Select" }).click();
	}

	/**
	 * Type text into the TipTap rich-text editor.
	 * TipTap renders a contenteditable div that accepts standard keyboard input.
	 */
	async fillDescription(text: string): Promise<void> {
		const editor = this.page.locator('[contenteditable="true"]');
		await editor.click();
		await this.page.keyboard.type(text);
	}

	/** Click the form submit button and wait for navigation. */
	async submitForm(): Promise<void> {
		await this.page.getByRole("button", { name: "Save" }).click();
		// After a successful create/edit, the server action redirects back to the list.
		await this.page.waitForURL(`**${BASE_PATH}**`);
	}

	// ---------------------------------------------------------------------------
	// List page helpers
	// ---------------------------------------------------------------------------

	/** Returns the table row locator for a project identified by its name. */
	projectRowByName(name: string): Locator {
		return this.page.getByRole("row").filter({ hasText: name });
	}

	/**
	 * Opens the actions menu for the project row with the given name and clicks
	 * the "Delete" menu item. Returns the delete-confirm dialog locator.
	 */
	async openDeleteDialog(name: string): Promise<Locator> {
		const row = this.projectRowByName(name);
		await row.getByRole("button", { name: "Open actions menu" }).click();
		await this.page.getByRole("menuitem", { name: "Delete" }).click();
		return this.page.getByRole("dialog", { name: /Delete project/i });
	}

	/** Confirms the delete action inside the delete-confirm dialog. */
	async confirmDelete(dialog: Locator): Promise<void> {
		await dialog.getByRole("button", { name: "Delete" }).click();
	}
}
