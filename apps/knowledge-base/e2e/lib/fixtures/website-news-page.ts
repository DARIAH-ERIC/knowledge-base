import { type Locator, type Page, expect } from "@playwright/test";

import { waitForActionRedirect } from "@/e2e/lib/fixtures/action-redirect";
import { clearDateSegments } from "@/e2e/lib/fixtures/date-picker";
import { dragGridRowDownByName } from "@/e2e/lib/fixtures/reorder";
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

	async fillPublicationDate(year: number, month: number, day: number): Promise<void> {
		await clearDateSegments(this.page, "Publication date");

		const group = this.page.getByRole("group", { name: "Publication date" });

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
		const dialog = this.page.getByRole("dialog", { name: "Media library" });
		await dialog.waitFor({ state: "visible" });
		const asset = dialog.getByRole("gridcell", { name: assetLabel });
		await expect(asset).toHaveCount(1);
		await asset.click();
		await dialog.getByRole("button", { name: "Select" }).click();
		await dialog.waitFor({ state: "hidden" });
	}

	async uploadImageFromMediaLibrary(filePath: string, label: string): Promise<void> {
		await this.page.getByRole("button", { name: "Select image" }).click();
		const dialog = this.page.getByRole("dialog", { name: "Media library" });
		await dialog.waitFor({ state: "visible" });
		await dialog.getByRole("tab", { name: "Upload" }).click();
		await dialog.locator('input[type="file"]').setInputFiles(filePath);
		await dialog.getByLabel("Label").fill(label);
		await dialog.getByLabel("Alt text").fill(`${label} alt text`);
		await dialog.getByRole("button", { name: "Upload" }).click();
		await dialog.waitFor({ state: "hidden" });
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

	private relatedEntitiesControl(): Locator {
		return this.relatedEntitiesSection().getByRole("button", { name: "Add related entity" });
	}

	private async closeRelatedEntitiesDialog(dialog: Locator): Promise<void> {
		await this.page.mouse.click(1, 1);
		await dialog.waitFor({ state: "hidden" });
	}

	async selectRelatedEntity(entityName: string): Promise<void> {
		const trigger = this.relatedEntitiesControl();
		const dialog = this.relatedEntitiesDialog();

		await trigger.click();
		await dialog.waitFor({ state: "visible" });

		const searchbox = dialog.getByRole("searchbox");
		await searchbox.fill(entityName);

		const option = dialog.getByRole("option", { name: entityName, exact: true });
		await option.waitFor({ state: "visible" });
		await option.click();
		await this.closeRelatedEntitiesDialog(dialog);
	}

	async removeRelatedEntity(entityName: string): Promise<void> {
		// Selected items render as rows in an orderable grid list; each row has a drag handle
		// (slot="drag") plus a Remove button. The button aria-labels are not locator-friendly in the
		// e2e build, so target the row by name and the non-drag button.
		const row = this.relatedEntitiesSection().getByRole("row", { name: entityName });
		await row.waitFor({ state: "visible" });
		await row.locator('button:not([slot="drag"])').click();
		await row.waitFor({ state: "hidden" });
	}

	/** Names of the currently-selected related entities, in display order. */
	async getRelatedEntityNames(): Promise<Array<string>> {
		const rows = this.relatedEntitiesSection().getByRole("row");
		const texts = await rows.allInnerTexts();
		return texts.map((text) => text.trim()).filter((text) => text !== "");
	}

	/** Drag a related-entity row one position down past the row below it. */
	async moveRelatedEntityDown(entityName: string): Promise<void> {
		await dragGridRowDownByName(
			this.page,
			this.relatedEntitiesSection().getByRole("row"),
			entityName,
		);
	}

	private contentBlockEditor(): Locator {
		return this.page.getByRole("textbox", { name: "Content" });
	}

	async addContentBlock(text: string): Promise<void> {
		await this.page.getByRole("button", { name: "Add block" }).click();
		await this.page.getByRole("menuitem", { name: "Content" }).click();
		await this.contentBlockEditor().fill(text);
	}

	async addContentWithCallout(options: {
		above: string;
		below: string;
		body: string;
		title: string;
	}): Promise<void> {
		await this.page.getByRole("button", { name: "Add block" }).click();
		await this.page.getByRole("menuitem", { name: "Content" }).click();

		const editor = this.contentBlockEditor();
		await editor.fill(options.above);
		await editor.press("Enter");
		await editor.pressSequentially(options.below);

		/** Insert at the end of the first paragraph, between the two rich-text runs. */
		await editor.press("Control+Home");
		await editor.press("End");
		await this.page.getByRole("button", { name: "Insert callout" }).click();

		const callout = this.page.getByLabel("Callout block");
		await callout.getByText("Warning", { exact: true }).click();
		await callout.getByRole("textbox", { name: "Title (optional)" }).fill(options.title);
		await callout.getByRole("textbox", { name: "Callout content" }).fill(options.body);
		await callout.getByRole("button", { name: "Apply" }).click();
	}

	async dragCalloutBeforeText(text: string): Promise<void> {
		const editor = this.contentBlockEditor();
		const callout = this.page.getByLabel("Callout block");
		const dragHandle = callout.locator("xpath=..");
		const targetParagraph = editor.locator("p").filter({ hasText: text });

		await dragHandle.scrollIntoViewIfNeeded();
		const sourceBox = await dragHandle.boundingBox();
		const targetBox = await targetParagraph.boundingBox();
		if (sourceBox == null || targetBox == null) {
			throw new Error("Could not resolve inline content-block drag coordinates.");
		}

		const startX = sourceBox.x + sourceBox.width / 2;
		const startY = sourceBox.y + sourceBox.height / 2;
		const dropX = targetBox.x + Math.min(24, targetBox.width / 2);
		const dropY = targetBox.y + 2;
		const { mouse } = this.page;
		// Native ProseMirror drag-and-drop needs paced pointer moves to establish a drag selection.
		// oxlint-disable-next-line playwright/no-wait-for-timeout
		const pause = (): Promise<void> => this.page.waitForTimeout(120);

		await mouse.move(startX, startY);
		await mouse.down();
		await pause();
		await mouse.move(startX, startY - 8);
		await pause();
		await mouse.move((startX + dropX) / 2, (startY + dropY) / 2);
		await pause();
		await mouse.move(dropX, dropY);
		await pause();
		await mouse.up();

		await expect
			.poll(async () => {
				const [nextCalloutBox, nextTargetBox] = await Promise.all([
					callout.boundingBox(),
					targetParagraph.boundingBox(),
				]);
				return (
					nextCalloutBox != null && nextTargetBox != null && nextCalloutBox.y < nextTargetBox.y
				);
			})
			.toBe(true);
	}

	async updateContentBlockText(text: string): Promise<void> {
		const editor = this.contentBlockEditor();
		await editor.clear();
		await editor.fill(text);
	}

	async removeFirstContentBlock(): Promise<void> {
		await this.page.getByRole("button", { name: "Remove block" }).first().click();
		const dialog = this.page.getByRole("alertdialog", { name: "Remove block" });
		await dialog.getByRole("button", { name: "Remove" }).click();
	}

	async submitForm(): Promise<void> {
		const isCreate = new URL(this.page.url()).pathname === `${BASE_PATH}/create`;
		await waitForActionRedirect({
			page: this.page,
			redirectPathname: isCreate ? new RegExp(`^${BASE_PATH}/[^/]+/details$`) : BASE_PATH,
			trigger: async () => {
				await this.page.getByRole("button", { name: /^Save(?! and publish\b).*$/ }).click();
			},
		});
		if (isCreate) {
			await this.goto();
		}
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
		const row = this.rowByTitle(title);
		await row.getByRole("button", { name: "Open actions menu" }).click();
		await this.page.getByRole("menuitem", { name: "View" }).click();
		await this.page.waitForURL(`**${BASE_PATH}/**/details`);
	}

	async gotoEditFromDetails(): Promise<void> {
		const editHref = await this.page.getByRole("link", { name: "Edit" }).getAttribute("href");

		if (editHref == null) {
			throw new Error("Could not find edit link on news details page.");
		}

		await this.page.goto(editHref);
		await this.page.waitForURL(`**${BASE_PATH}/**/edit`);
	}

	async gotoEditFromList(title: string): Promise<void> {
		const row = this.rowByTitle(title);
		await row.getByRole("button", { name: "Open actions menu" }).click();
		await Promise.all([
			this.page.waitForURL(`**${BASE_PATH}/**/edit`),
			this.page.getByRole("menuitem", { name: "Edit" }).click(),
		]);
	}

	// ---------------------------------------------------------------------------
	// Details page — status badges
	// ---------------------------------------------------------------------------

	/** "Draft" badge in the lifecycle bar (only present when no published version exists). */
	detailsDraftBadge(): Locator {
		return this.page.getByText("Draft", { exact: true });
	}

	/** "Published" badge in the lifecycle bar (only present when published-only, no draft). */
	detailsPublishedBadge(): Locator {
		return this.page.getByText("Published", { exact: true });
	}

	/** "Published with draft changes" badge in the lifecycle bar (draft + published both exist). */
	detailsPublishedWithDraftChangesBadge(): Locator {
		return this.page.getByText("Published with draft changes");
	}

	// ---------------------------------------------------------------------------
	// Details page — lifecycle actions
	// ---------------------------------------------------------------------------

	async publishItem(): Promise<void> {
		await waitForActionRedirect({
			page: this.page,
			redirectPathname: BASE_PATH,
			trigger: async () => {
				await this.page.getByRole("button", { name: "Publish" }).click();
			},
		});
	}

	async discardDraft(): Promise<void> {
		await this.page.getByRole("button", { name: "Discard draft" }).click();
		const dialog = this.page.getByRole("dialog");
		await dialog.waitFor({ state: "visible" });
		await waitForActionRedirect({
			page: this.page,
			redirectPathname: BASE_PATH,
			trigger: async () => {
				await dialog.getByRole("button", { name: "Discard" }).click();
			},
		});
	}

	// ---------------------------------------------------------------------------
	// Details page — version selector
	// ---------------------------------------------------------------------------

	versionSelectorDraftLink(): Locator {
		return this.page.getByRole("link", { name: "Draft", exact: true });
	}

	versionSelectorPublishedLink(): Locator {
		return this.page.getByRole("link", { name: "Published" });
	}

	// ---------------------------------------------------------------------------
	// List page — status badge within a row
	// ---------------------------------------------------------------------------

	/** "Published" status badge inside a specific list row. */
	publishedBadgeInRow(title: string): Locator {
		return this.rowByTitle(title).getByText("Published", { exact: true });
	}

	/** Both "Published" and "Draft" status badges inside a specific list row. */
	publishedAndDraftBadgesInRow(title: string): Locator {
		return this.rowByTitle(title)
			.locator('[data-slot="badge"]')
			.filter({ hasText: /Published|Draft/ });
	}

	/** "Draft" status badge inside a specific list row. */
	draftBadgeInRow(title: string): Locator {
		return this.rowByTitle(title).getByText("Draft", { exact: true });
	}
}
