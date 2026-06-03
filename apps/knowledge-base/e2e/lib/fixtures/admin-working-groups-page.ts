import type { Locator, Page } from "@playwright/test";

import { waitForActionRedirect } from "@/e2e/lib/fixtures/action-redirect";
import { waitForActionSuccess } from "@/e2e/lib/fixtures/action-success";
import { E2E_TEST_ASSET_KEY } from "@/e2e/lib/fixtures/database-service";
import { fillSearchAndWaitForUrl } from "@/e2e/lib/fixtures/search";

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

	async fillAcronym(acronym: string): Promise<void> {
		await this.page.getByLabel("Acronym").fill(acronym);
	}

	async fillSshocMarketplaceActorId(id: number): Promise<void> {
		await this.page.locator('input[name="sshocMarketplaceActorId"]').fill(String(id));
	}

	async fillSummary(text: string): Promise<void> {
		await this.page.getByLabel("Summary").fill(text);
	}

	async selectTestImage(): Promise<void> {
		await this.page.locator('input[name="imageKey"]').evaluate((input, value) => {
			(input as HTMLInputElement).value = value;
			input.dispatchEvent(new Event("input", { bubbles: true }));
		}, E2E_TEST_ASSET_KEY);
	}

	async removeImage(): Promise<void> {
		await this.page.getByRole("button", { name: "Remove image" }).click();
	}

	async fillDescription(text: string): Promise<void> {
		const editor = this.page.getByRole("textbox", { name: "Description" });
		await editor.click();
		await this.page.keyboard.type(text);
	}

	async submitForm(): Promise<void> {
		await waitForActionRedirect({
			page: this.page,
			redirectPathname: BASE_PATH,
			trigger: async () => {
				await this.page.getByRole("button", { name: /^Save(?! and publish\b).*$/ }).click();
			},
		});
	}

	// ---------------------------------------------------------------------------
	// List page helpers
	// ---------------------------------------------------------------------------

	async gotoEditFromList(name: string): Promise<void> {
		await this.searchByName(name);
		const row = this.rowByName(name);
		await row.getByRole("button", { name: "Open actions menu" }).click();
		await Promise.all([
			this.page.waitForURL("**/edit"),
			this.page.getByRole("menuitem", { name: "Edit" }).click(),
		]);
	}

	async searchByName(name: string): Promise<void> {
		await fillSearchAndWaitForUrl(this.page, BASE_PATH, name);
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

	// ---------------------------------------------------------------------------
	// Edit page — unit relations section
	// ---------------------------------------------------------------------------

	async goToRelationsTab(): Promise<void> {
		await this.page.getByRole("tab", { name: "Relations" }).click();
	}

	relationsTable(): Locator {
		return this.page.getByRole("grid", { name: "relations" });
	}

	async selectFirstRelationType(): Promise<void> {
		const control = this.page
			.locator('[data-slot="control"]')
			.filter({ has: this.page.getByText("Relation type", { exact: true }) });
		await control.locator("button").click();
		await this.page.getByRole("option").first().click();
	}

	async selectFirstRelatedUnit(): Promise<void> {
		await this.page.getByRole("button", { name: "No related unit selected" }).click();
		await this.page.getByRole("option").first().waitFor({ state: "visible" });
		await this.page.getByRole("option").first().click();
	}

	async fillRelationDatePicker(
		label: string,
		year: number,
		month: number,
		day: number,
	): Promise<void> {
		// Scoped to the "add relation" form to avoid collision with the chairs section date pickers.
		const form = this.page
			.locator("form")
			.filter({ has: this.page.getByRole("button", { name: "Add relation" }) });
		const group = form.getByRole("group", { name: label });
		await group.getByRole("spinbutton", { name: /day/i }).click();
		await this.page.keyboard.type(String(day).padStart(2, "0"));
		await group.getByRole("spinbutton", { name: /month/i }).click();
		await this.page.keyboard.type(String(month).padStart(2, "0"));
		await group.getByRole("spinbutton", { name: /year/i }).click();
		await this.page.keyboard.type(String(year));
	}

	async submitAddRelation(): Promise<void> {
		await waitForActionSuccess({
			page: this.page,
			trigger: async () => {
				await this.page.getByRole("button", { name: "Add relation" }).click();
			},
		});
	}

	async clickEndRelation(): Promise<void> {
		await this.relationsTable().getByRole("button", { name: "End relation" }).first().click();
	}

	async fillEndRelationDate(year: number, month: number, day: number): Promise<void> {
		const dialog = this.page.getByRole("alertdialog", { name: "End relation" });
		await dialog.waitFor({ state: "visible" });
		const group = dialog.getByRole("group", { name: "End date" });
		await group.getByRole("spinbutton", { name: /day/i }).click();
		await this.page.keyboard.type(String(day).padStart(2, "0"));
		await group.getByRole("spinbutton", { name: /month/i }).click();
		await this.page.keyboard.type(String(month).padStart(2, "0"));
		await group.getByRole("spinbutton", { name: /year/i }).click();
		await this.page.keyboard.type(String(year));
	}

	async confirmEndRelation(): Promise<void> {
		const dialog = this.page.getByRole("alertdialog", { name: "End relation" });
		await dialog.getByRole("button", { name: "Confirm" }).click();
		await dialog.waitFor({ state: "hidden" });
	}
}
