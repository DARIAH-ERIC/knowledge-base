import { type Locator, type Page, expect } from "@playwright/test";

/**
 * Open a react-aria `<Select>` and pick its first option.
 *
 * Immediately after a tab switch the trigger can briefly be non-interactive while the panel is
 * revealed from a React `Activity` boundary, so a single opening click is silently dropped and the
 * listbox never opens. Retry the open (re-clicking the trigger) until an option is shown — an
 * attempt that re-clicks an already-open select just toggles it shut and is retried — then pick the
 * first.
 */
export async function pickFirstSelectOption(page: Page, trigger: Locator): Promise<void> {
	const firstOption = page.getByRole("option").first();
	await expect(async () => {
		await trigger.click();
		await expect(firstOption).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 30_000 });
	await firstOption.click();
}
