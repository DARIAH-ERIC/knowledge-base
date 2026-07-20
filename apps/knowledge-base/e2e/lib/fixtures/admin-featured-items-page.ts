import { type Locator, type Page, expect } from "@playwright/test";

const BASE_PATH = "/en/dashboard/website/featured";

/** Accessible names for one featured section's selection list and its "add" popover trigger. */
interface FeaturedSectionConfig {
	/** Shared by the selection list (a GridList → role "grid") and its options popover. */
	gridLabel: string;
	/** The button that opens the searchable options popover. */
	addLabel: string;
}

const SECTIONS = {
	news: { gridLabel: "Featured news items", addLabel: "Add news item" },
	events: { gridLabel: "Featured events", addLabel: "Add event" },
} satisfies Record<string, FeaturedSectionConfig>;

/**
 * One featured section (news or events) on the website featured-items page. Each is an
 * `AsyncListSelect` (isOrderable, maxItems=3): selected items render as full-width,
 * drag-reorderable rows; a popover (opened via its "add" button) provides a searchable,
 * multi-select option list.
 */
class FeaturedSection {
	private readonly page: Page;
	private readonly config: FeaturedSectionConfig;

	constructor(page: Page, config: FeaturedSectionConfig) {
		this.page = page;
		this.config = config;
	}

	/** The selection list (a GridList → role "grid"); distinct from the popover listbox. */
	private featuredList(): Locator {
		return this.page.getByRole("grid", { name: this.config.gridLabel });
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

	/**
	 * Web-first assertion that the selection list holds exactly these names, in order. The section is
	 * an `AsyncListSelect` that hydrates its selected rows asynchronously after navigation, so a
	 * one-shot {@link getFeaturedNames} read can observe a half-rendered list; polling waits that out.
	 */
	async expectFeaturedOrder(expected: Array<string>): Promise<void> {
		await expect.poll(() => this.getFeaturedNames()).toStrictEqual(expected);
	}

	private async openOptions(): Promise<Locator> {
		await this.page.getByRole("button", { name: this.config.addLabel }).click();
		const searchbox = this.page.getByRole("searchbox");
		await searchbox.waitFor({ state: "visible" });
		return searchbox;
	}

	private async closeOptions(): Promise<void> {
		await this.page.keyboard.press("Escape");
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
		// The button aria-labels are not locator-friendly in the e2e build, so distinguish by slot:
		// the drag handle has slot="drag", the remove button does not.
		await row.locator('button:not([slot="drag"])').click();
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
	 * Moves a featured row one position down via pointer drag-and-drop. React Aria's keyboard DnD is
	 * hard to drive deterministically here (the grid's roving focus + i18n-broken drop-target
	 * labels), so we drag the row's handle down past the next row, dropping near its bottom edge so
	 * the dragged item lands after it.
	 */
	async moveFeaturedDown(name: string): Promise<void> {
		// The section hydrates its rows asynchronously after navigation, so read the order only once
		// the dragged row is present; otherwise it can transiently appear last (no row below it).
		await this.featuredRow(name).waitFor({ state: "visible" });

		const names = await this.getFeaturedNames();
		const belowName = names[names.indexOf(name) + 1];
		if (belowName === undefined) {
			throw new Error(`No row below "${name}" to move past.`);
		}

		// The drag handle is the button with slot="drag". Coordinate-based mouse moves do not
		// auto-scroll, so bring it into view first.
		const handle = this.featuredRow(name).locator('button[slot="drag"]');
		await handle.scrollIntoViewIfNeeded();
		await this.featuredRow(belowName).waitFor({ state: "visible" });

		const handleBox = await handle.boundingBox();
		const belowBox = await this.featuredRow(belowName).boundingBox();
		if (handleBox == null || belowBox == null) {
			throw new Error("Could not resolve bounding boxes for reorder.");
		}

		const startX = handleBox.x + handleBox.width / 2;
		const startY = handleBox.y + handleBox.height / 2;
		const dropY = belowBox.y + belowBox.height - 4;

		const dragging = this.page.locator('[data-dragging="true"]').first();
		const { mouse } = this.page;
		// React Aria's pointer drag-and-drop needs real gaps between pointer events (firing them
		// back-to-back does not register the drag), so the moves are paced.
		// oxlint-disable-next-line playwright/no-wait-for-timeout
		const pause = (): Promise<void> => this.page.waitForTimeout(120);

		await mouse.move(startX, startY);
		await mouse.down();
		await pause();
		await mouse.move(startX, startY + 8);
		await pause();
		await dragging.waitFor({ state: "visible" });
		await mouse.move(startX, (startY + dropY) / 2);
		await pause();
		await mouse.move(startX, dropY);
		await pause();
		await mouse.up();
		// Wait for the drop to complete so the reordered list has rendered.
		await dragging.waitFor({ state: "hidden" });
	}
}

/**
 * Page object for the website featured-items page. The page hosts two independent featured sections
 * — news and events — each exposed via {@link news} / {@link events}; `goto` and `save` act on the
 * shared page and form.
 */
export class AdminFeaturedItemsPage {
	readonly page: Page;
	readonly news: FeaturedSection;
	readonly events: FeaturedSection;

	constructor(page: Page) {
		this.page = page;
		this.news = new FeaturedSection(page, SECTIONS.news);
		this.events = new FeaturedSection(page, SECTIONS.events);
	}

	async goto(): Promise<void> {
		await this.page.goto(BASE_PATH);
		await this.page.waitForURL(`**${BASE_PATH}`);
	}

	async save(): Promise<void> {
		await this.page.getByRole("button", { name: "Save", exact: true }).click();
		await this.page.getByText("Featured items saved.").waitFor({ state: "visible" });
	}
}
