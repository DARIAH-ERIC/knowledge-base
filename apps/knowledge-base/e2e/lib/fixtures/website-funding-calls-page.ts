import type { Locator, Page } from "@playwright/test";

import { fillSearchAndWaitForUrl } from "@/e2e/lib/fixtures/search";

const BASE_PATH = "/en/dashboard/website/funding-calls";

export class WebsiteFundingCallsPage {
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

	async submitForm(): Promise<void> {
		await Promise.all([
			this.page.waitForURL(`**${BASE_PATH}`, { timeout: 60_000 }),
			this.page.getByRole("button", { name: /^Save(?! and publish\b).*$/ }).click(),
		]);
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
		return this.page.getByRole("dialog", { name: /Delete funding call/i });
	}

	async confirmDelete(dialog: Locator): Promise<void> {
		await dialog.getByRole("button", { name: "Delete" }).click();
	}

	// ---------------------------------------------------------------------------
	// Details page — navigation
	// ---------------------------------------------------------------------------

	async gotoDetailsFromList(title: string): Promise<void> {
		const row = this.rowByTitle(title);
		await row.getByRole("button", { name: "Open actions menu" }).click();
		await this.page.getByRole("menuitem", { name: "View" }).click();
		await this.page.waitForURL(`**${BASE_PATH}/**/details`);
	}

	async gotoEditFromDetails(): Promise<void> {
		const editHref = await this.page.getByRole("link", { name: "Edit" }).getAttribute("href");

		if (editHref == null) {
			throw new Error("Could not find edit link on funding call details page.");
		}

		await this.page.goto(editHref);
		await this.page.waitForURL(`**${BASE_PATH}/**/edit`);
	}

	// ---------------------------------------------------------------------------
	// Details page — status badges
	// ---------------------------------------------------------------------------

	detailsDraftBadge(): Locator {
		return this.page.getByText("Draft", { exact: true });
	}

	detailsPublishedBadge(): Locator {
		return this.page.getByText("Published", { exact: true });
	}

	detailsPublishedWithDraftChangesBadge(): Locator {
		return this.page.getByText("Published with draft changes");
	}

	// ---------------------------------------------------------------------------
	// Details page — lifecycle actions
	// ---------------------------------------------------------------------------

	async publishItem(): Promise<void> {
		await this.page.getByRole("button", { name: "Publish" }).click();
		await this.page.waitForURL(`**${BASE_PATH}`, { timeout: 60_000 });
	}

	async discardDraft(): Promise<void> {
		await this.page.getByRole("button", { name: "Discard draft" }).click();
		const dialog = this.page.getByRole("dialog");
		await dialog.waitFor({ state: "visible" });
		await dialog.getByRole("button", { name: "Discard" }).click();
		await this.page.waitForURL(`**${BASE_PATH}`, { timeout: 60_000 });
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
	// List page — status badges within a row
	// ---------------------------------------------------------------------------

	publishedBadgeInRow(title: string): Locator {
		return this.rowByTitle(title).getByText("Published", { exact: true });
	}

	draftBadgeInRow(title: string): Locator {
		return this.rowByTitle(title).getByText("Draft", { exact: true });
	}
}
