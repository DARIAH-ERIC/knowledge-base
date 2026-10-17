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

		await page.getByRole("button", { name: "Toggle sidebar" }).first().click();
		const sheet = page.getByRole("dialog", { name: "Sidebar" });
		await expect(sheet).toBeVisible();

		await sheet.getByRole("link", { name: "Persons", exact: true }).click();
		await page.waitForURL("**/dashboard/administrator/persons");

		await expect(sheet).toBeHidden();
	});
});
