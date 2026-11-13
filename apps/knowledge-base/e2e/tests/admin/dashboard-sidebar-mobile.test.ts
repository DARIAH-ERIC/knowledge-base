import { waitForHydration } from "@/e2e/lib/fixtures/hydration";
import { expect, test } from "@/e2e/lib/test";

/** Below the sidebar's 768px breakpoint, where it renders as a sheet. */
test.use({ viewport: { width: 393, height: 852 } });

/**
 * On mobile the sidebar is a sheet over the page. Navigating from it must close it, or the author
 * lands on the new page with the menu still covering it. The sheet closes when the pathname
 * changes, not in the link's click handler, so this also covers navigation the sheet did not
 * start.
 */
test.describe("dashboard sidebar on mobile", () => {
	test("closes the sheet after navigating from it", async ({ page }) => {
		await page.goto("/en/dashboard/administrator");

		const toggle = page.getByRole("button", { name: "Toggle sidebar" }).first();
		const sheet = page.getByRole("dialog", { name: "Sidebar" });
		const link = sheet.getByRole("link", { name: "Persons", exact: true });
		const isOnPersons = () =>
			new URL(page.url()).pathname.endsWith("/dashboard/administrator/persons");

		await waitForHydration(toggle);

		/**
		 * A press that lands while part of the page is still hydrating forces React to finish that
		 * hydration synchronously and re-creates the subtree (see `selectTab`). Here that re-creates
		 * the sidebar with the sheet closed again, so the link the click was waiting for is gone for
		 * good. Retry opening the sheet and following the link until the navigation happens; once it
		 * has, the sheet is never re-opened.
		 */
		await expect(async () => {
			if (isOnPersons()) {
				return;
			}
			if (!(await sheet.isVisible())) {
				await toggle.click();
			}
			await expect(sheet).toBeVisible({ timeout: 2_000 });
			await link.click({ timeout: 5_000 });
			await page.waitForURL("**/dashboard/administrator/persons", { timeout: 10_000 });
		}).toPass({ timeout: 60_000 });

		await expect(sheet).toBeHidden();
	});
});
