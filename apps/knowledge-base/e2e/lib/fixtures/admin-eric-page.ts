import type { Locator, Page } from "@playwright/test";

import { waitForActionRedirect } from "@/e2e/lib/fixtures/action-redirect";

const BASE_PATH = "/en/dashboard/administrator/eric";

/**
 * DARIAH ERIC is a singleton: the list page holds exactly one row and there is no create or delete
 * flow, so this page object takes no worker index and its callers must serialize (see
 * `admin-eric.test.ts`).
 */
export class AdminEricPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	async goto(): Promise<void> {
		await this.page.goto(BASE_PATH);
		await this.page.waitForURL(`**${BASE_PATH}`);
	}

	// ---------------------------------------------------------------------------
	// List page helpers — navigation
	// ---------------------------------------------------------------------------

	/** The single data row — matched by its actions menu so a renamed ERIC does not break it. */
	row(): Locator {
		return this.page
			.getByRole("row")
			.filter({ has: this.page.getByRole("button", { name: "Open actions menu" }) });
	}

	async gotoEditFromList(): Promise<void> {
		await this.goto();
		await this.row().getByRole("button", { name: "Open actions menu" }).click();
		await Promise.all([
			this.page.waitForURL(`**${BASE_PATH}/**/edit`),
			this.page.getByRole("menuitem", { name: "Edit" }).click(),
		]);
	}

	async gotoDetailsFromList(): Promise<void> {
		await this.goto();
		await this.row().getByRole("button", { name: "Open actions menu" }).click();
		await Promise.all([
			this.page.waitForURL(`**${BASE_PATH}/**/details`),
			this.page.getByRole("menuitem", { name: "View" }).click(),
		]);
	}

	// ---------------------------------------------------------------------------
	// Form helpers
	// ---------------------------------------------------------------------------

	emailField(): Locator {
		return this.page.getByLabel("Email", { exact: true });
	}

	async fillEmail(email: string): Promise<void> {
		await this.emailField().fill(email);
	}

	saveButton(): Locator {
		return this.page.getByRole("button", { name: /^Save(?! and publish\b).*$/ });
	}

	async submitForm(): Promise<void> {
		await waitForActionRedirect({
			page: this.page,
			redirectPathname: new RegExp(`^${BASE_PATH}/[^/]+/details$`),
			trigger: async () => {
				await this.saveButton().click();
			},
		});
	}
}
