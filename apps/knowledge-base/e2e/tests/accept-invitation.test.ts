import { randomBytes } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

/** What anyone who was not sent an invitation sees: no form, no way to set a password. */
test.describe("accept invitation", () => {
	test("should reject a missing token", async ({ page }) => {
		await page.goto("/en/auth/accept-invitation");

		await expect(page.getByRole("heading", { name: "Invitation not valid" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Set password" })).toBeHidden();
	});

	test("should reject an unknown token", async ({ page }) => {
		await page.goto(`/en/auth/accept-invitation?token=${randomBytes(32).toString("hex")}`);

		await expect(page.getByRole("heading", { name: "Invitation not valid" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Set password" })).toBeHidden();
	});
});
