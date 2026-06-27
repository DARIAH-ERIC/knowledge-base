import type { Locator, Page } from "@playwright/test";

const BASE_PATH = "/en/dashboard/website/metadata";

/** Accessible name shared by the featured-items selection list and its options popover. */
const FEATURED_LABEL = "Featured news items";

/**
 * Page object for the website metadata page, focused on the "Featured News Items" select (an
 * `AsyncListSelect`): selected items render as full-width, drag-reorderable rows; a popover (opened
 * via "Add news item") provides a searchable, multi-select option list.
 */
export class AdminSiteMetadataPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	async goto(): Promise<void> {
		await this.page.goto(BASE_PATH);
		await this.page.waitForURL(`**${BASE_PATH}`);
	}

	/** The selection list (a GridList → role "grid"); distinct from the popover listbox. */
	private featuredList(): Locator {
		return this.page.getByRole("grid", { name: FEATURED_LABEL });
	}

	featuredRow(name: string): Locator {
		return this.featuredList().getByRole("row", { name });
	}

	/** Names of the currently-selected featured items, in display order. */
	async getFeaturedNames(): Promise<Array<string>> {
		const rows = this.featuredList().getByRole("row");
		const texts = await rows.allInnerTexts();
		return texts.map((text) => text.trim()).filter((text) => text !== "");
	}

	private async openOptions(): Promise<Locator> {
		await this.page.getByRole("button", { name: "Add news item" }).click();
		const searchbox = this.page.getByRole("searchbox");
		await searchbox.waitFor({ state: "visible" });
		return searchbox;
	}

	private async closeOptions(): Promise<void> {
		// Escape only clears the React Aria SearchField, and this DialogTrigger popover does not close
		// on Escape — toggle the trigger button to close it.
		await this.page.getByRole("button", { name: "Add news item" }).click();
		await this.page.getByRole("searchbox").waitFor({ state: "hidden" });
	}

	async addFeatured(name: string): Promise<void> {
		const searchbox = await this.openOptions();
		await searchbox.fill(name);

		const option = this.page.getByRole("option", { name, exact: true });
		await option.waitFor({ state: "visible" });
		await option.click();
		await this.closeOptions();

		await this.featuredRow(name).waitFor({ state: "visible" });
	}

	async removeFeatured(name: string): Promise<void> {
		const row = this.featuredRow(name);
		// The remove button is the last button in the row (after the drag handle). Its aria-label is
		// not locator-friendly in the e2e build, so target it by position.
		await row.getByRole("button").last().click();
		await row.waitFor({ state: "hidden" });
	}

	/** Whether a given option is disabled in the popover (e.g. because the max is reached). */
	async isOptionDisabled(name: string): Promise<boolean> {
		const searchbox = await this.openOptions();
		await searchbox.fill(name);

		const option = this.page.getByRole("option", { name, exact: true });
		await option.waitFor({ state: "visible" });
		const isDisabled = (await option.getAttribute("aria-disabled")) === "true";

		await this.closeOptions();
		return isDisabled;
	}

	/**
	 * Moves a featured row one position down using React Aria's keyboard drag-and-drop: focus the
	 * drag handle, press Enter to pick up, ArrowDown to move past the next row, Enter to drop.
	 */
	async moveFeaturedDown(name: string): Promise<void> {
		// The drag handle is the first button in the row (rendered before the content / remove button).
		const handle = this.featuredRow(name).getByRole("button").first();
		await handle.focus();
		await this.page.keyboard.press("Enter");
		await this.page.keyboard.press("ArrowDown");
		await this.page.keyboard.press("Enter");
	}

	async save(): Promise<void> {
		await this.page.getByRole("button", { name: "Save", exact: true }).click();
		await this.page.getByText("Metadata saved.").waitFor({ state: "visible" });
	}
}
